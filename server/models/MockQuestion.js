import mongoose from 'mongoose';

const mockQuestionSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Technical', 'Behavioral', 'General'],
    required: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function (options) {
        return options.length === 4 && options.every((option) => option.trim().length > 0);
      },
      message: 'A mock question must have exactly four choices'
    }
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    validate: Number.isInteger
  }
});

mockQuestionSchema.index({ category: 1, questionText: 1 }, { unique: true });

const MockQuestion = mongoose.model('MockQuestion', mockQuestionSchema);

export default MockQuestion;
