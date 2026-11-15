import mongoose from 'mongoose';

const interviewResultSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    unique: true,
    sparse: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['Technical', 'Behavioral', 'General'],
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

const InterviewResult = mongoose.model('InterviewResult', interviewResultSchema);

export default InterviewResult;
