import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
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
  suggestedAnswer: {
    type: String,
    required: true,
    trim: true
  }
});

questionSchema.index({ category: 1, questionText: 1 }, { unique: true });

const Question = mongoose.model('Question', questionSchema);

export default Question;
