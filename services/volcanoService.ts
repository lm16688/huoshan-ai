// services/volcanoService.ts
import { SubtitleSegment, SubtitleLanguage } from "../types";

/**
 * 将 File 转换为 Data URL（包含 MIME 类型和 Base64 数据）
 */
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 调用火山引擎视觉模型（responses API）分析视频
 * 模型 ID 通过环境变量 VOLC_MODEL_ID 指定，默认为您提供的示例 ID
 */
export const analyzeVideoWithVolcano = async (
  videoFile: File,
  targetLanguage: SubtitleLanguage,
  onProgress: (msg: string) => void
): Promise<SubtitleSegment[]> => {
  const apiKey = process.env.VOLC_API_KEY;
  const modelId = process.env.VOLC_MODEL_ID || "ep-20260220203528-5874j"; // 您提供的示例模型 ID

  if (!apiKey) {
    throw new Error("缺少火山引擎 API Key，请在环境变量中设置 VOLC_API_KEY");
  }

  onProgress("正在准备视频数据...");
  const dataUrl = await fileToDataURL(videoFile);

  onProgress(`正在调用火山引擎视觉模型分析视频 (目标语言: ${targetLanguage})...`);

  const languagePrompt = targetLanguage === SubtitleLanguage.AUTO
    ? "自动检测视频中的语言。"
    : `将视频中的语音转录并翻译为 ${targetLanguage}。`;

  // 构建系统提示，要求返回字幕 JSON 数组
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

  // 构建请求体（符合 responses API 格式）
  const requestBody = {
    model: modelId,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: dataUrl, // 使用 Data URL（注意：API 可能期望的是 HTTP URL 或 Base64 编码，这里使用 Data URL）
          },
          {
            type: "input_text",
            text: systemPrompt,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
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

    // 打印原始响应以便调试（开发环境可保留，生产环境建议移除）
    console.log("API 原始响应:", data);

    // 根据 responses API 的实际返回结构提取内容
    // 假设返回的格式为 { output: [ { content: [ { text: "..." } ] } ] }
    // 您需要根据火山引擎的实际响应调整下面的解析逻辑
    let content = "";
    if (data.output && Array.isArray(data.output)) {
      // 取第一个输出的文本内容
      const firstOutput = data.output[0];
      if (firstOutput.content && Array.isArray(firstOutput.content)) {
        const textItem = firstOutput.content.find((item: any) => item.type === "output_text");
        if (textItem) content = textItem.text;
      }
    }

    if (!content) {
      throw new Error("API 返回内容为空或格式不符");
    }

    // 清洗可能的 Markdown 代码块
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
    throw new Error(error?.message || "视频分析失败，请检查 API Key 或模型 ID");
  }
};