import express from 'express';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import QuestionProgress from '../models/QuestionProgress.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
const allowedCategories = ['Technical', 'Behavioral', 'General'];
const allowedProgressStatuses = ['got_it', 'almost', 'review'];

function isObjectBody(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

router.get('/progress', requireAuth, async (req, res) => {
  try {
    const progress = await QuestionProgress.find({ user: req.userId })
      .select('question status updatedAt')
      .sort({ updatedAt: -1 });

    return res.json({ progress });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load question progress' });
  }
});

router.get('/review', requireAuth, async (req, res) => {
  try {
    const reviewProgress = await QuestionProgress.find({
      user: req.userId,
      status: { $in: ['almost', 'review'] }
    })
      .populate('question')
      .sort({ updatedAt: -1 });

    const questions = reviewProgress
      .filter((item) => item.question)
      .map((item) => ({
        _id: item.question._id,
        category: item.question.category,
        questionText: item.question.questionText,
        suggestedAnswer: item.question.suggestedAnswer,
        status: item.status,
        updatedAt: item.updatedAt
      }));

    return res.json({ questions });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load questions to review' });
  }
});

router.put('/:id/progress', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Invalid question progress status' });
    }

    if (typeof req.body.status !== 'string' || !allowedProgressStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid question progress status' });
    }

    const questionExists = await Question.exists({ _id: req.params.id });
    if (!questionExists) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const progress = await QuestionProgress.findOneAndUpdate(
      { user: req.userId, question: req.params.id },
      { $set: { status: req.body.status } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('question status updatedAt');

    return res.json({ progress });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Question progress was updated at the same time. Please try again.' });
    }
    return res.status(500).json({ error: 'Could not save question progress' });
  }
});

router.delete('/:id/progress', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const deletedProgress = await QuestionProgress.findOneAndDelete({
      user: req.userId,
      question: req.params.id
    });

    if (!deletedProgress) {
      return res.status(404).json({ error: 'Question progress not found' });
    }

    return res.json({ message: 'Question progress reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Could not reset question progress' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const category = req.query.category;
    const filter = {};

    if (category) {
      if (typeof category !== 'string' || !allowedCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid question category' });
      }

      filter.category = category;
    }

    const questions = await Question.find(filter).sort({ category: 1, _id: 1 });
    return res.json({ questions });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load questions' });
  }
});

export default router;
