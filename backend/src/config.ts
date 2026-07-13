import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env (if present), then backend/.env (backend-specific overrides).
// Platform-provided environment variables always take precedence over both.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function requiredInProduction(name: string, value: string | undefined, blockedValues: string[] = []) {
  if (process.env.NODE_ENV !== 'production') return;
  if (!value || blockedValues.includes(value)) {
    throw new Error(`Missing or insecure production environment variable: ${name}`);
  }
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const configuredClientOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const localClientOrigins = ['http://localhost:5174', 'http://127.0.0.1:5174'];
const clientOrigins = Array.from(
  new Set([...(process.env.NODE_ENV === 'production' ? configuredClientOrigins : [...configuredClientOrigins, ...localClientOrigins])]),
);

requiredInProduction('JWT_SECRET', process.env.JWT_SECRET, ['change-this-jwt-secret', 'change-this-access-secret']);
requiredInProduction('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, ['change-this-refresh-secret']);
requiredInProduction('DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME', process.env.DATABASE_URL || process.env.DB_HOST);

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: Number(process.env.PORT || process.env.API_PORT || 3001),
  clientOrigin: process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5174'),
  clientOrigins,
  trustProxy: parseBoolean(process.env.TRUST_PROXY, process.env.NODE_ENV === 'production'),
  serveStaticFrontend: parseBoolean(process.env.SERVE_STATIC_FRONTEND, process.env.NODE_ENV === 'production'),
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'restaurant_db',
    ssl: parseBoolean(process.env.DB_SSL, process.env.NODE_ENV === 'production' || Boolean(process.env.DATABASE_URL)),
    // Whether to verify the server certificate chain. TiDB Cloud and most
    // managed MySQL use publicly trusted CAs, so true is safe by default.
    // Set DB_SSL_VERIFY=false only if your provider uses a private/unbundled CA.
    sslVerify: parseBoolean(process.env.DB_SSL_VERIFY, true),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    accessTokenTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTokenTtl: process.env.JWT_REFRESH_TTL || '7d',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  },
  restaurant: {
    name: process.env.RESTAURANT_NAME || 'Zaika Hub',
    address: process.env.RESTAURANT_ADDRESS || '123 Food Street, Food City',
    gstNumber: process.env.RESTAURANT_GST || 'GSTIN000000000',
  },
};

export const isDevelopment = config.nodeEnv !== 'production';
