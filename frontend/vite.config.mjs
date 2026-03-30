import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_DEV_API_HOST = 'localhost';
const DEFAULT_DEV_API_PORT = 5001;
const DEFAULT_FRONTEND_PORT = 3000;

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')
);

const resolveDevApiTarget = (env) => {
  if (env.VITE_DEV_PROXY_TARGET) {
    return env.VITE_DEV_PROXY_TARGET;
  }

  const apiHost = env.VITE_DEV_API_HOST || DEFAULT_DEV_API_HOST;
  const apiPort = Number(env.VITE_DEV_API_PORT || DEFAULT_DEV_API_PORT);
  return `http://${apiHost}:${apiPort}`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = resolveDevApiTarget(env);
  const devApiUrl = new URL(devApiTarget);
  const devWsProtocol = devApiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const processEnv = {
    NODE_ENV: mode,
    REACT_APP_VERSION: env.REACT_APP_VERSION || packageJson.version,
    REACT_APP_ENV: env.REACT_APP_ENV || mode,
    REACT_APP_API_URL: env.REACT_APP_API_URL || '',
    REACT_APP_WS_URL: env.REACT_APP_WS_URL || `${devWsProtocol}//${devApiUrl.host}`,
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
      port: Number(env.PORT || env.VITE_PORT || DEFAULT_FRONTEND_PORT),
      proxy: {
        '/api': {
          target: devApiTarget,
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
