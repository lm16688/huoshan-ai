import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/huoshan-ai/', // 替换为您的仓库名
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.VOLC_API_KEY': JSON.stringify(env.VOLC_API_KEY),
      'process.env.VOLC_MODEL_ID': JSON.stringify(env.VOLC_MODEL_ID),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
