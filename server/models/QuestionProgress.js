import mongoose from 'mongoose';

const questionProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    status: {
      type: String,
      enum: ['got_it', 'almost', 'review'],
      required: true
    }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

questionProgressSchema.index({ user: 1, question: 1 }, { unique: true });

const QuestionProgress = mongoose.model('QuestionProgress', questionProgressSchema);

export default QuestionProgress;
