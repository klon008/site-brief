import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Для GitHub Pages сборка идёт в подпапку /имя-репозитория/.
// BASE_PATH передаётся workflow (.github/workflows/deploy.yml) без слэшей,
// локальная сборка и dev-сервер работают с базой «/».
const basePath = process.env.BASE_PATH?.replace(/^\/+|\/+$/g, '');

export default defineConfig({
  base: basePath ? `/${basePath}/` : '/',
  plugins: [react()],
});
