const REQUIRED_ENV = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
];
const REQUIRED_ENV_PRODUCTION = ['JWT_ACCESS_SECRET', 'SMTP_HOST'];

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const isProduction = config.NODE_ENV === 'production';
  // Database configuration:
  // Production/Neon can use DATABASE_URL.
  // Local development can continue using DB_* variables.
  const hasDatabaseUrl = !!config.DATABASE_URL;

  if (!hasDatabaseUrl) {
    for (const key of REQUIRED_ENV) {
      if (!config[key]) {
        throw new Error(
          `Missing required database environment variable: ${key} or DATABASE_URL`,
        );
      }
    }
  }

  if (isProduction) {
    for (const key of REQUIRED_ENV_PRODUCTION) {
      if (!config[key]) {
        throw new Error(
          `Missing required environment variable in production: ${key}`,
        );
      }
    }
    if (!config.JWT_ACCESS_SECRET || config.JWT_ACCESS_SECRET === 'change-me') {
      throw new Error(
        'JWT_ACCESS_SECRET must be set to a strong value in production',
      );
    }
  }

  return config;
}
