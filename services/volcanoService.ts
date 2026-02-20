// services/volcanoService.ts
import { SubtitleSegment, SubtitleLanguage } from "../types";

/**
 * 将 File 对象转换为 Base64 字符串（分块处理，避免内存溢出）
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      const chunkSize = 8192; // 8KB 分块
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      try {
        const base64 = btoa(binary);
        resolve(base64);
      } catch (e) {
        reject(new Error("视频文件过大，请尝试压缩后重新上传"));
      }
    };
    reader.readAsArrayBuffer(file);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * 调用火山引擎多模态模型分析视频
 * 返回与之前 Gemini 相同的 SubtitleSegment 数组
 */
export const analyzeVideoWithVolcano = async (
  videoFile: File,
  targetLanguage: SubtitleLanguage,
  onProgress: (msg: string) => void
): Promise<SubtitleSegment[]> => {
  const apiKey = process.env.VOLC_API_KEY;
  if (!apiKey) {
    throw new Error("缺少火山引擎 API Key，请在环境变量中设置 VOLC_API_KEY");
  }

  onProgress("正在准备视频数据...");
  const base64Video = await fileToBase64(videoFile);

  onProgress(`正在调用火山引擎 AI 分析视频 (目标语言: ${targetLanguage})...`);

  const languagePrompt = targetLanguage === SubtitleLanguage.AUTO
    ? "自动检测视频中的语言。"
    : `将视频中的语音转录并翻译为 ${targetLanguage}。`;

  const systemPrompt = `你是一名专业的影视剪辑师和语言学家。请对提供的完整视频进行高精度语音转录、语义修剪和时间轴同步。

${languagePrompt}

严格要求：
1. 完整覆盖整个视频，从 0:00 到结束，不漏掉任何有意义的语音片段。
2. 自动剔除冗余内容：
   - 剔除所有无意义片段：静音（>0.4秒）、背景噪音、非人声。
   - 剔除所有填充词和冗余表达（如：um, uh, like, you know, 呃, 那个, 然后, 就是等）。
3. 时间戳精确到毫秒级（误差 ≤ 10ms）：
   - startTime 为第一个清晰音节开始的时间。
   - endTime 为最后一个有意义音节结束的时间。
4. 语义分割：在自然停顿处切分，每段不超过 15 个单词。
5. 输出格式必须为严格的 JSON 数组，每个对象包含字段：
   id: string (uuid 格式),
   startTime: number (秒),
   endTime: number (秒),
   text: string,
   isRedundant: boolean (此段是否为冗余内容),
   confidence: number (0-1 置信度)

只返回 JSON 数组，不要包含其他解释文字。`;

  const requestBody = {
    model: "doubao-1-5-vision-pro-32k-250115",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${videoFile.type};base64,${base64Video}`,
            },
          },
          {
            type: "text",
            text: systemPrompt,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  };

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`火山引擎 API 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("API 返回内容为空");
    }

    // 尝试解析 JSON（可能包含 markdown 代码块，需清洗）
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7, -3).trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3, -3).trim();
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error("返回数据不是数组");
    }

    // 按时间排序并返回
    return parsed.sort((a, b) => a.startTime - b.startTime);
  } catch (error: any) {
    console.error("火山引擎调用失败:", error);
    throw new Error(error?.message || "视频分析失败，请检查 API Key 或网络");
  }
};