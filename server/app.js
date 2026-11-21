import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import interviewRoutes from './routes/interviews.js';

const app = express();

// Fix Render proxy configuration
app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin(requestOrigin, callback) {
    const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    callback(null, !requestOrigin || requestOrigin === allowedOrigin);
  }
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/interviews', interviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    message: 'InterviewPrep API is running!'
  });
});

export default app;