// ============================================================
// Clyptus Job Portal - Configuration Validation Spec
// ============================================================

import configuration from './configuration';

describe('Configuration Loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw fatal error in production if JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => configuration()).toThrow('FATAL: JWT_SECRET must be securely configured');
  });

  it('should throw fatal error in production if JWT_SECRET is shorter than 32 chars', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short_secret';

    expect(() => configuration()).toThrow('FATAL: JWT_SECRET must be securely configured');
  });

  it('should throw fatal error in production if JWT_SECRET contains replace-in-production placeholder', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'my-long-key-replace-in-production-placeholder-12345';

    expect(() => configuration()).toThrow('FATAL: JWT_SECRET must be securely configured');
  });

  it('should succeed in production with valid strong JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_secure_and_random_production_jwt_secret_key_12345';

    const config = configuration();
    expect(config.jwt.secret).toBe('a_very_secure_and_random_production_jwt_secret_key_12345');
    expect(config.nodeEnv).toBe('production');
  });

  it('should load environment variables in development mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'dev_test_secret_key_12345';

    const config = configuration();
    expect(config.jwt.secret).toBe('dev_test_secret_key_12345');
    expect(config.nodeEnv).toBe('development');
  });
});
