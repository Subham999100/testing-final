// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Central Configuration Loader
// ============================================================

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-replace-in-production-min-32-chars-long',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
});
