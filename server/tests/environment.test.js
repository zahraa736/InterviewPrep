import { describe, expect, test } from 'vitest';
import { validateEnvironment } from '../validateEnvironment.js';

const validEnvironment = {
  JWT_SECRET: 'a-secure-random-test-secret-with-more-than-32-characters',
  MONGODB_URI: 'mongodb://localhost:27017/interviewprep_test'
};

describe('server environment validation', () => {
  test('rejects a missing JWT_SECRET', () => {
    expect(() => validateEnvironment({ MONGODB_URI: validEnvironment.MONGODB_URI }))
      .toThrow('JWT_SECRET is required and cannot be empty');
  });

  test('rejects an empty JWT_SECRET', () => {
    expect(() => validateEnvironment({
      JWT_SECRET: '   ',
      MONGODB_URI: validEnvironment.MONGODB_URI
    })).toThrow('JWT_SECRET is required and cannot be empty');
  });

  test('rejects a missing MONGODB_URI', () => {
    expect(() => validateEnvironment({ JWT_SECRET: validEnvironment.JWT_SECRET }))
      .toThrow('MONGODB_URI is required and cannot be empty');
  });

  test('rejects an empty MONGODB_URI', () => {
    expect(() => validateEnvironment({
      JWT_SECRET: validEnvironment.JWT_SECRET,
      MONGODB_URI: '   '
    })).toThrow('MONGODB_URI is required and cannot be empty');
  });

  test('rejects a short JWT_SECRET', () => {
    expect(() => validateEnvironment({
      JWT_SECRET: 'short-secret',
      MONGODB_URI: validEnvironment.MONGODB_URI
    })).toThrow('JWT_SECRET must be at least 32 characters and cannot be a placeholder value');
  });

  test('rejects an obvious placeholder JWT_SECRET', () => {
    expect(() => validateEnvironment({
      JWT_SECRET: 'replace_with_a_random_secret_at_least_32_characters_long',
      MONGODB_URI: validEnvironment.MONGODB_URI
    })).toThrow('JWT_SECRET must be at least 32 characters and cannot be a placeholder value');
  });

  test('accepts a complete environment with a strong JWT_SECRET', () => {
    expect(() => validateEnvironment(validEnvironment)).not.toThrow();
  });
});
