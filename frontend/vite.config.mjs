import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const processEnv = {
    NODE_ENV: mode,
    REACT_APP_VERSION: env.REACT_APP_VERSION || packageJson.version,
    REACT_APP_ENV: env.REACT_APP_ENV || mode,
    REACT_APP_API_URL: env.REACT_APP_API_URL || '',
    REACT_APP_WS_URL: env.REACT_APP_WS_URL || 'ws://localhost:5001',
    REACT_APP_CSRF_COOKIE_NAME: env.REACT_APP_CSRF_COOKIE_NAME || 'ytech_csrf'
  };

  return {
    plugins: [react()],
    build: {
      outDir: 'build',
      emptyOutDir: true
    },
    server: {
      host: true,
      port: Number(env.PORT || 3000),
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:5001',
          changeOrigin: true
        }
      }
    },
    define: {
      'process.env': JSON.stringify(processEnv),
      ...Object.fromEntries(
        Object.entries(processEnv).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
      )
    },
    test: {
      globals: true
    }
  };
});
