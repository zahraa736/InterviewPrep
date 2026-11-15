import express from 'express';
import mongoose from 'mongoose';
import requireAuth from '../middleware/requireAuth.js';
import MockQuestion from '../models/MockQuestion.js';
import InterviewSession from '../models/InterviewSession.js';
import InterviewResult from '../models/InterviewResult.js';
import Question from '../models/Question.js';

const router = express.Router();
const allowedCategories = ['Technical', 'Behavioral', 'General'];
const interviewLength = 5;
const interviewDuration = 5 * 60 * 1000;
const submissionGracePeriod = 10 * 1000;

function isObjectBody(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

function formatResult(result) {
  return {
    _id: result._id,
    category: result.category,
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: Math.round((result.score / result.totalQuestions) * 100),
    completedAt: result.completedAt
  };
}

function getStoredMapValue(map, key) {
  if (map instanceof Map) return map.get(String(key));
  return map?.[String(key)];
}

function storedAnswersFor(session) {
  return session.questions.map((question, index) => (
    getStoredMapValue(session.selectedAnswers, index) ?? null
  ));
}

router.get('/results', requireAuth, async (req, res) => {
  try {
    const results = await InterviewResult.find({ user: req.userId })
      .sort({ completedAt: -1 });

    return res.json({ results: results.map(formatResult) });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load interview results' });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [results, totalPracticeQuestions] = await Promise.all([
      InterviewResult.find({ user: req.userId }),
      Question.countDocuments()
    ]);

    const percentages = results.map((result) => (
      (result.score / result.totalQuestions) * 100
    ));

    const bestScorePercentage = percentages.length > 0
      ? Math.round(Math.max(...percentages))
      : 0;

    const averageScorePercentage = percentages.length > 0
      ? Math.round(percentages.reduce((total, percentage) => total + percentage, 0) / percentages.length)
      : 0;

    return res.json({
      stats: {
        totalInterviews: results.length,
        bestScorePercentage,
        averageScorePercentage,
        totalPracticeQuestions
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load interview statistics' });
  }
});

router.post('/start', requireAuth, async (req, res) => {
  try {
    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Invalid interview category' });
    }

    const category = req.body.category;

    if (typeof category !== 'string' || !allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid interview category' });
    }

    const questions = await MockQuestion.aggregate([
      { $match: { category } },
      { $sample: { size: interviewLength } }
    ]);

    if (questions.length < interviewLength) {
      return res.status(400).json({ error: 'Not enough questions are available for this category' });
    }

    const deadline = new Date(Date.now() + interviewDuration);
    const session = await InterviewSession.create({
      user: req.userId,
      category,
      questions: questions.map((question) => question._id),
      deadline
    });

    return res.status(201).json({
      sessionId: session._id,
      deadline,
      questions: questions.map((question) => ({
        _id: question._id,
        category: question.category,
        questionText: question.questionText,
        options: question.options
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Could not start interview' });
  }
});

router.put('/:sessionId/answers/:questionIndex', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const questionIndex = Number(req.params.questionIndex);

    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Invalid answer selection' });
    }

    const { answerIndex, version } = req.body;

    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid interview session' });
    }

    if (!Number.isInteger(questionIndex) || String(questionIndex) !== req.params.questionIndex) {
      return res.status(400).json({ error: 'Invalid question index' });
    }

    if (!Number.isInteger(answerIndex) || !Number.isSafeInteger(version) || version < 1) {
      return res.status(400).json({ error: 'Invalid answer selection' });
    }

    const session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.userId
    }).populate('questions');

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (questionIndex < 0 || questionIndex >= session.questions.length) {
      return res.status(400).json({ error: 'Invalid question index' });
    }

    const question = session.questions[questionIndex];
    if (answerIndex < 0 || answerIndex >= question.options.length) {
      return res.status(400).json({ error: 'Invalid answer index' });
    }

    const now = new Date();
    if (now >= session.deadline) {
      return res.status(408).json({ error: 'The interview time has expired' });
    }

    if (session.submittedAt || session.answersLockedAt) {
      return res.status(409).json({ error: 'This interview can no longer be changed' });
    }

    const answerPath = `selectedAnswers.${questionIndex}`;
    const versionPath = `answerVersions.${questionIndex}`;
    const updatedSession = await InterviewSession.findOneAndUpdate(
      {
        _id: session._id,
        user: req.userId,
        submittedAt: null,
        answersLockedAt: null,
        deadline: { $gt: now },
        $or: [
          { [versionPath]: { $exists: false } },
          { [versionPath]: { $lt: version } }
        ]
      },
      {
        $set: {
          [answerPath]: answerIndex,
          [versionPath]: version
        }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (updatedSession) {
      return res.json({
        answer: { questionIndex, answerIndex, version }
      });
    }

    const currentSession = await InterviewSession.findOne({
      _id: session._id,
      user: req.userId
    });

    if (!currentSession) {
      return res.status(404).json({ error: 'Interview session not found' });
    }
    if (new Date() >= currentSession.deadline) {
      return res.status(408).json({ error: 'The interview time has expired' });
    }
    if (currentSession.submittedAt || currentSession.answersLockedAt) {
      return res.status(409).json({ error: 'This interview can no longer be changed' });
    }

    return res.json({
      answer: {
        questionIndex,
        answerIndex: getStoredMapValue(currentSession.selectedAnswers, questionIndex) ?? null,
        version: getStoredMapValue(currentSession.answerVersions, questionIndex) ?? 0
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Could not save interview answer' });
  }
});

router.post('/submit', requireAuth, async (req, res) => {
  try {
    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Invalid interview session' });
    }

    const { sessionId, selectedAnswers } = req.body;

    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid interview session' });
    }

    const session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.userId
    }).populate('questions');

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const existingResult = await InterviewResult.findOne({
      session: session._id,
      user: req.userId
    });

    if (existingResult) {
      if (!session.submittedAt) {
        await InterviewSession.updateOne(
          { _id: session._id, user: req.userId, submittedAt: null },
          { $set: { submittedAt: existingResult.completedAt } }
        );
      }

      return res.json({ result: formatResult(existingResult) });
    }

    if (session.submittedAt) {
      return res.status(409).json({ error: 'This interview has already been submitted' });
    }

    const now = new Date();
    let lockedSession = session;

    if (!session.answersLockedAt) {
      const latestSubmissionTime = new Date(
        session.deadline.getTime() + submissionGracePeriod
      );

      if (now > latestSubmissionTime) {
        return res.status(408).json({ error: 'The interview time has expired' });
      }

      if (selectedAnswers !== undefined) {
        const validAnswers = Array.isArray(selectedAnswers) &&
          selectedAnswers.length === session.questions.length &&
          selectedAnswers.every((answer) => (
            answer === null || (Number.isInteger(answer) && answer >= 0 && answer <= 3)
          ));

        if (!validAnswers) {
          return res.status(400).json({ error: 'Please submit one answer value for each question' });
        }
      }

      lockedSession = await InterviewSession.findOneAndUpdate(
        {
          _id: session._id,
          user: req.userId,
          submittedAt: null,
          answersLockedAt: null,
          deadline: { $gte: new Date(now.getTime() - submissionGracePeriod) }
        },
        { $set: { answersLockedAt: now } },
        { returnDocument: 'after', runValidators: true }
      ).populate('questions');

      if (!lockedSession) {
        lockedSession = await InterviewSession.findOne({
          _id: session._id,
          user: req.userId
        }).populate('questions');

        const concurrentResult = await InterviewResult.findOne({
          session: session._id,
          user: req.userId
        });

        if (concurrentResult) {
          return res.json({ result: formatResult(concurrentResult) });
        }

        if (!lockedSession?.answersLockedAt) {
          return res.status(409).json({ error: 'This interview can no longer be submitted' });
        }
      }
    }

    const lockedAnswers = storedAnswersFor(lockedSession);
    let score = 0;
    lockedSession.questions.forEach((question, index) => {
      if (lockedAnswers[index] === question.correctAnswerIndex) {
        score += 1;
      }
    });

    let result;

    try {
      result = await InterviewResult.create({
        session: session._id,
        user: req.userId,
        category: lockedSession.category,
        score,
        totalQuestions: lockedSession.questions.length,
        completedAt: now
      });
    } catch (error) {
      if (error.code !== 11000) throw error;

      result = await InterviewResult.findOne({
        session: session._id,
        user: req.userId
      });

      if (!result) throw error;
    }

    await InterviewSession.updateOne(
      { _id: session._id, user: req.userId, submittedAt: null },
      { $set: { submittedAt: result.completedAt } }
    );

    return res.json({ result: formatResult(result) });
  } catch (error) {
    return res.status(500).json({ error: 'Could not submit interview' });
  }
});

export default router;
