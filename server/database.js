import mongoose from 'mongoose';

export async function connectToDatabase(uri, { isTestDatabase = false } = {}) {
  if (!uri) {
    throw new Error('A MongoDB connection URI is required');
  }

  if (process.env.NODE_ENV === 'test') {
    if (!isTestDatabase || !process.env.TEST_MONGODB_URI) {
      throw new Error('Tests may only connect to the isolated test database');
    }

    if (uri !== process.env.TEST_MONGODB_URI) {
      throw new Error('The requested database is not the isolated test database');
    }

    if (process.env.MONGODB_URI && uri === process.env.MONGODB_URI) {
      throw new Error('Tests cannot use the configured development database');
    }
  } else if (isTestDatabase) {
    throw new Error('The isolated test database may only be used while testing');
  }

  return mongoose.connect(uri);
}
