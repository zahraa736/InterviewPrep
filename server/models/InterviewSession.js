import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema({
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
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockQuestion',
    required: true
  }],
  selectedAnswers: {
    type: Map,
    of: Number,
    default: () => ({})
  },
  answerVersions: {
    type: Map,
    of: Number,
    default: () => ({})
  },
  deadline: {
    type: Date,
    required: true
  },
  answersLockedAt: {
    type: Date,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;
