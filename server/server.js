import dotenv from 'dotenv';
import app from './app.js';
import { connectToDatabase } from './database.js';
import { validateEnvironment } from './validateEnvironment.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

try {
  validateEnvironment();
} catch (error) {
  console.error('Server configuration error:', error.message);
  process.exit(1);
}

// Connect to MongoDB before starting the server
try {
  await connectToDatabase(process.env.MONGODB_URI);

  console.log('Connected to MongoDB');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

} catch {
  console.error('MongoDB connection failed. Check MONGODB_URI and database availability.');
  process.exit(1);
}
