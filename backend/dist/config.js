import dotenv from 'dotenv';
dotenv.config();
const configuredClientOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const localClientOrigins = ['http://localhost:5174', 'http://127.0.0.1:5174'];
const clientOrigins = Array.from(new Set([...configuredClientOrigins, ...localClientOrigins]));
export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPort: Number(process.env.API_PORT || 3001),
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
    clientOrigins,
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'restaurant_db',
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
