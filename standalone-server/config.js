// 配置：环境变量优先，其次 standalone-server/.env（KEY=VALUE 行）
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = join(__dirname, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

export const {
  ZHIPU_API_KEY = '',
  ADMIN_PASSWORD = '',
  CHAT_MODEL = 'glm-4.6',
  FILTER_MODEL = 'glm-4.5-air',
  EMBED_MODEL = 'embedding-3',
  KB_THRESHOLD = '0.42',
  TOP_K = '5',
  GATE_ENABLED = 'true',
  DAILY_CHAT_CAP = '5000',
  PORT = '8090',
  OSS_BUCKET = 'kuchuang-yide',
  OSS_REGION = 'oss-ap-southeast-1',
  OSS_ACCESS_KEY_ID = '',
  OSS_ACCESS_KEY_SECRET = '',
} = process.env;
