// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Central Configuration Loader
// ============================================================

export default () => {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('FATAL: JWT_SECRET must be securely configured with at least 32 characters in production.');
    }
  } else if (isProduction && (jwtSecret.includes('replace-in-production') || jwtSecret.length < 32)) {
    throw new Error('FATAL: JWT_SECRET must be securely configured with at least 32 characters in production.');
  }

  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
  };
};

