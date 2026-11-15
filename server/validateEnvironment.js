const insecureSecretFragments = [
  'change-me',
  'change_me',
  'changeme',
  'placeholder',
  'replace-with',
  'replace_with',
  'your-secret',
  'your_secret'
];

export function validateEnvironment(environment = process.env) {
  const jwtSecret = environment.JWT_SECRET?.trim();
  const mongodbUri = environment.MONGODB_URI?.trim();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required and cannot be empty');
  }

  if (!mongodbUri) {
    throw new Error('MONGODB_URI is required and cannot be empty');
  }

  const normalizedSecret = jwtSecret.toLowerCase();
  const usesInsecureValue = jwtSecret.length < 32 ||
    insecureSecretFragments.some((fragment) => normalizedSecret.includes(fragment));

  if (usesInsecureValue) {
    throw new Error('JWT_SECRET must be at least 32 characters and cannot be a placeholder value');
  }
}
