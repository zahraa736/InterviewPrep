import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import app from '../app.js';
import { connectToDatabase } from '../database.js';
import { loginRateLimitStore, signupRateLimitStore } from '../routes/auth.js';
import InterviewResult from '../models/InterviewResult.js';
import InterviewSession from '../models/InterviewSession.js';
import MockQuestion from '../models/MockQuestion.js';
import Question from '../models/Question.js';
import QuestionProgress from '../models/QuestionProgress.js';
import User from '../models/User.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-that-is-not-used-outside-tests';

let mongoServer;
let emailNumber = 0;
let interviewNumber = 0;

function uniqueEmail() {
  emailNumber += 1;
  return `integration-${emailNumber}@example.com`;
}

async function createAccountAndLogin() {
  const email = uniqueEmail();
  const password = 'SecurePass123';

  await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test User', email, password })
    .expect(201);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return loginResponse.body.token;
}

async function createUserSession(name) {
  const email = uniqueEmail();
  const password = 'SecurePass123';

  const signupResponse = await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password })
    .expect(201);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    user: signupResponse.body.user,
    token: loginResponse.body.token
  };
}

async function createTimedInterview(deadlineOffsetMs) {
  interviewNumber += 1;
  const account = await createUserSession(`Timer User ${interviewNumber}`);
  const questions = await MockQuestion.insertMany(
    Array.from({ length: 5 }, (_, index) => ({
      category: 'General',
      questionText: `Timer test ${interviewNumber}, question ${index + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: index % 4
    }))
  );
  const session = await InterviewSession.create({
    user: account.user._id,
    category: 'General',
    questions: questions.map((question) => question._id),
    deadline: new Date(Date.now() + deadlineOffsetMs)
  });

  return {
    token: account.token,
    session,
    correctAnswers: questions.map((question) => question.correctAnswerIndex)
  };
}

function submitInterview(token, sessionId, selectedAnswers, extraBody = {}) {
  return request(app)
    .post('/api/interviews/submit')
    .set('Authorization', `Bearer ${token}`)
    .send({ sessionId, selectedAnswers, ...extraBody });
}

function saveInterviewAnswer(token, sessionId, questionIndex, answerIndex, version) {
  return request(app)
    .put(`/api/interviews/${sessionId}/answers/${questionIndex}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ answerIndex, version });
}

async function saveInterviewAnswers(token, sessionId, answers) {
  await Promise.all(answers.map((answer, questionIndex) => (
    answer === null
      ? Promise.resolve()
      : saveInterviewAnswer(token, sessionId, questionIndex, answer, 1).expect(200)
  )));
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'interviewprep_test' }
  });

  const testDatabaseUri = mongoServer.getUri();
  process.env.TEST_MONGODB_URI = testDatabaseUri;
  await connectToDatabase(testDatabaseUri, { isTestDatabase: true });
});

beforeEach(async () => {
  await Promise.all([
    signupRateLimitStore.resetAll(),
    loginRateLimitStore.resetAll()
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  delete process.env.TEST_MONGODB_URI;
});

describe('CORS configuration', () => {
  test('allows only the origin configured by CLIENT_ORIGIN', async () => {
    const originalClientOrigin = process.env.CLIENT_ORIGIN;
    process.env.CLIENT_ORIGIN = 'https://interviewprep.example';

    try {
      const allowedResponse = await request(app)
        .get('/api/health')
        .set('Origin', 'https://interviewprep.example');
      const blockedResponse = await request(app)
        .get('/api/health')
        .set('Origin', 'https://untrusted.example');

      expect(allowedResponse.headers['access-control-allow-origin'])
        .toBe('https://interviewprep.example');
      expect(blockedResponse.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      if (originalClientOrigin === undefined) {
        delete process.env.CLIENT_ORIGIN;
      } else {
        process.env.CLIENT_ORIGIN = originalClientOrigin;
      }
    }
  });

  test('allows the local Vite origin when CLIENT_ORIGIN is not set', async () => {
    const originalClientOrigin = process.env.CLIENT_ORIGIN;
    delete process.env.CLIENT_ORIGIN;

    try {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    } finally {
      if (originalClientOrigin !== undefined) {
        process.env.CLIENT_ORIGIN = originalClientOrigin;
      }
    }
  });
});

describe('request body validation', () => {
  test('authentication endpoints reject missing and non-object bodies with 400', async () => {
    const cases = [
      {
        path: '/api/auth/signup',
        error: 'Name, email and password are required'
      },
      {
        path: '/api/auth/login',
        error: 'Email and password are required'
      },
      {
        path: '/api/auth/forgot-password',
        error: 'Please enter a valid email address'
      },
      {
        path: '/api/auth/reset-password',
        error: 'This password reset link is invalid or has expired'
      }
    ];

    for (const testCase of cases) {
      const missingBody = await request(app).post(testCase.path);
      const arrayBody = await request(app).post(testCase.path).send([]);

      expect(missingBody.status).toBe(400);
      expect(missingBody.body.error).toBe(testCase.error);
      expect(arrayBody.status).toBe(400);
      expect(arrayBody.body.error).toBe(testCase.error);
    }
  });

  test('protected write endpoints reject missing and non-object bodies with 400', async () => {
    const token = await createAccountAndLogin();
    const objectId = new mongoose.Types.ObjectId();
    const cases = [
      { method: 'put', path: `/api/questions/${objectId}/progress` },
      { method: 'post', path: '/api/interviews/start' },
      { method: 'put', path: `/api/interviews/${objectId}/answers/0` },
      { method: 'post', path: '/api/interviews/submit' }
    ];

    for (const testCase of cases) {
      const missingBody = await request(app)[testCase.method](testCase.path)
        .set('Authorization', `Bearer ${token}`);
      const arrayBody = await request(app)[testCase.method](testCase.path)
        .set('Authorization', `Bearer ${token}`)
        .send([]);

      expect(missingBody.status).toBe(400);
      expect(arrayBody.status).toBe(400);
    }
  });

  test('malformed and null JSON bodies return 400 instead of 500', async () => {
    const malformedJson = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    const nullJson = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('null');

    expect(malformedJson.status).toBe(400);
    expect(nullJson.status).toBe(400);
  });
});

describe('authentication and basic API validation', () => {
  test('signup returns 429 after 10 requests from the same IP', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Rate Limit User',
          email: uniqueEmail(),
          password: 'SecurePass123'
        })
        .expect(201);
    }

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Blocked Signup User',
        email: uniqueEmail(),
        password: 'SecurePass123'
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many signup attempts. Please try again in 15 minutes.');
  });

  test('login returns 429 after 10 requests from the same IP', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@example.com', password: 'WrongPassword123' })
        .expect(401);
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'WrongPassword123' });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many login attempts. Please try again in 15 minutes.');
  });

  test('signup with valid data succeeds', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Valid User',
        email: uniqueEmail(),
        password: 'SecurePass123'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Account created successfully');
    expect(response.body.user).toMatchObject({ name: 'Valid User' });
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  test('signup with invalid data returns 400', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('signup with a duplicate email returns 409', async () => {
    const email = uniqueEmail();
    const account = { name: 'Duplicate User', email, password: 'SecurePass123' };

    await request(app).post('/api/auth/signup').send(account).expect(201);
    const response = await request(app).post('/api/auth/signup').send(account);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('An account with this email already exists');
  });

  test('signup stores a bcrypt hash instead of the plaintext password', async () => {
    const email = uniqueEmail();
    const password = 'SecurePass123';

    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Hashed User', email, password })
      .expect(201);

    const user = await User.findOne({ email }).select('+password_hash');

    expect(user.password_hash).not.toBe(password);
    expect(await bcrypt.compare(password, user.password_hash)).toBe(true);
  });

  test('login with correct credentials returns a JWT', async () => {
    const email = uniqueEmail();
    const password = 'SecurePass123';

    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Login User', email, password })
      .expect(201);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(email);
  });

  test('login with the wrong password returns 401', async () => {
    const email = uniqueEmail();

    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Wrong Password User', email, password: 'SecurePass123' })
      .expect(201);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  test('a protected route without a token returns 401', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  test('a protected route with an invalid token returns 401', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });

  test('an invalid MongoDB question ID returns 400', async () => {
    const token = await createAccountAndLogin();
    const response = await request(app)
      .put('/api/questions/not-a-valid-id/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'got_it' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid question ID');
  });

  test('a nonexistent question returns 404', async () => {
    const token = await createAccountAndLogin();
    const missingQuestionId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .put(`/api/questions/${missingQuestionId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'got_it' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Question not found');
  });
});

describe('user ownership and private data isolation', () => {
  test('protected private-data routes reject missing and invalid JWT tokens', async () => {
    const missingTokenResponse = await request(app).get('/api/questions/progress');
    const invalidTokenResponse = await request(app)
      .get('/api/interviews/results')
      .set('Authorization', 'Bearer invalid-token');

    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body.error).toBe('Authentication required');
    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body.error).toBe('Invalid or expired token');
  });

  test('keeps Practice Question progress separate for User A and User B', async () => {
    const userA = await createUserSession('Practice User A');
    const userB = await createUserSession('Practice User B');
    const question = await Question.create({
      category: 'General',
      questionText: 'Ownership test practice question',
      suggestedAnswer: 'This answer exists only for the isolated ownership test.'
    });

    await request(app)
      .put(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ status: 'review' })
      .expect(200);

    const userBProgressBefore = await request(app)
      .get('/api/questions/progress')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);
    const userBReviewBefore = await request(app)
      .get('/api/questions/review')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);

    expect(userBProgressBefore.body.progress).toEqual([]);
    expect(userBReviewBefore.body.questions).toEqual([]);

    await request(app)
      .put(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ status: 'got_it' })
      .expect(200);

    const userAProgress = await request(app)
      .get('/api/questions/progress')
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(200);
    const userBProgress = await request(app)
      .get('/api/questions/progress')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);

    expect(userAProgress.body.progress).toHaveLength(1);
    expect(userAProgress.body.progress[0]).toMatchObject({
      question: question._id.toString(),
      status: 'review'
    });
    expect(userBProgress.body.progress).toHaveLength(1);
    expect(userBProgress.body.progress[0]).toMatchObject({
      question: question._id.toString(),
      status: 'got_it'
    });
  });

  test('keeps Mock Interview sessions, results, and statistics private to their owner', async () => {
    const userA = await createUserSession('Interview User A');
    const userB = await createUserSession('Interview User B');
    const mockQuestions = await MockQuestion.insertMany(
      Array.from({ length: 5 }, (_, index) => ({
        category: 'Technical',
        questionText: `Ownership test mock question ${index + 1}`,
        options: ['Correct answer', 'Option B', 'Option C', 'Option D'],
        correctAnswerIndex: 0
      }))
    );

    const startResponse = await request(app)
      .post('/api/interviews/start')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ category: 'Technical' })
      .expect(201);

    expect(startResponse.body.questions).toHaveLength(mockQuestions.length);

    const sessionId = startResponse.body.sessionId;
    const selectedAnswers = startResponse.body.questions.map(() => 0);

    const userBSubmitResponse = await request(app)
      .post('/api/interviews/submit')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ sessionId, selectedAnswers });

    expect(userBSubmitResponse.status).toBe(404);
    expect(userBSubmitResponse.body.error).toBe('Interview session not found');

    await saveInterviewAnswers(userA.token, sessionId, selectedAnswers);

    const userASubmitResponse = await request(app)
      .post('/api/interviews/submit')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ sessionId, selectedAnswers })
      .expect(200);

    expect(userASubmitResponse.body.result).toMatchObject({
      category: 'Technical',
      score: 5,
      totalQuestions: 5,
      percentage: 100
    });

    const userAResults = await request(app)
      .get('/api/interviews/results')
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(200);
    const userAStats = await request(app)
      .get('/api/interviews/stats')
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(200);
    const userBResults = await request(app)
      .get('/api/interviews/results')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);
    const userBStats = await request(app)
      .get('/api/interviews/stats')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);

    expect(userAResults.body.results).toHaveLength(1);
    expect(userAResults.body.results[0]._id).toBe(userASubmitResponse.body.result._id);
    expect(userAStats.body.stats).toMatchObject({
      totalInterviews: 1,
      bestScorePercentage: 100,
      averageScorePercentage: 100
    });
    expect(userBResults.body.results).toEqual([]);
    expect(userBStats.body.stats).toMatchObject({
      totalInterviews: 0,
      bestScorePercentage: 0,
      averageScorePercentage: 0
    });
  });
});

describe('QuestionProgress deletion', () => {
  test('deletes the authenticated user\'s saved progress without deleting the question', async () => {
    const account = await createUserSession('Delete Progress User');
    const question = await Question.create({
      category: 'Technical',
      questionText: 'QuestionProgress deletion success test',
      suggestedAnswer: 'The progress record should be deleted, but this question should remain.'
    });

    await request(app)
      .put(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${account.token}`)
      .send({ status: 'got_it' })
      .expect(200);

    const response = await request(app)
      .delete(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${account.token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Question progress reset successfully');
    expect(await QuestionProgress.findOne({ user: account.user._id, question: question._id })).toBeNull();
    expect(await Question.exists({ _id: question._id })).not.toBeNull();

    const progressResponse = await request(app)
      .get('/api/questions/progress')
      .set('Authorization', `Bearer ${account.token}`)
      .expect(200);

    expect(progressResponse.body.progress).toEqual([]);
  });

  test('returns 400 for an invalid question ID', async () => {
    const account = await createUserSession('Invalid Delete ID User');
    const response = await request(app)
      .delete('/api/questions/not-a-valid-id/progress')
      .set('Authorization', `Bearer ${account.token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid question ID');
  });

  test('returns 404 when the authenticated user has no saved progress', async () => {
    const account = await createUserSession('Missing Progress User');
    const question = await Question.create({
      category: 'Behavioral',
      questionText: 'QuestionProgress missing record test',
      suggestedAnswer: 'No progress record is created for this test.'
    });
    const response = await request(app)
      .delete(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${account.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Question progress not found');
  });

  test('does not let one user delete another user\'s progress', async () => {
    const userA = await createUserSession('Progress Owner');
    const userB = await createUserSession('Other Progress User');
    const question = await Question.create({
      category: 'General',
      questionText: 'QuestionProgress delete ownership test',
      suggestedAnswer: 'Only the owner can delete this progress record.'
    });

    await request(app)
      .put(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ status: 'review' })
      .expect(200);

    const response = await request(app)
      .delete(`/api/questions/${question._id}/progress`)
      .set('Authorization', `Bearer ${userB.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Question progress not found');
    expect(await QuestionProgress.findOne({
      user: userA.user._id,
      question: question._id,
      status: 'review'
    })).not.toBeNull();
  });
});

describe('Mock Interview timing, scoring, and duplicate protection', () => {
  test('saves an answer before the server-side deadline', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const response = await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      0,
      interview.correctAnswers[0],
      1
    );

    expect(response.status).toBe(200);
    expect(response.body.answer).toEqual({
      questionIndex: 0,
      answerIndex: interview.correctAnswers[0],
      version: 1
    });

    const savedSession = await InterviewSession.findById(interview.session._id);
    expect(savedSession.selectedAnswers.get('0')).toBe(interview.correctAnswers[0]);
    expect(savedSession.answerVersions.get('0')).toBe(1);
  });

  test('rejects answer changes at or after the server-side deadline', async () => {
    const interview = await createTimedInterview(-1000);
    const response = await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      0,
      interview.correctAnswers[0],
      1
    );

    expect(response.status).toBe(408);
    expect(response.body.error).toBe('The interview time has expired');
  });

  test('does not let another user save answers for the session', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const otherUser = await createUserSession('Other Answer User');
    const response = await saveInterviewAnswer(
      otherUser.token,
      interview.session._id,
      0,
      0,
      1
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Interview session not found');
  });

  test('rejects invalid question and option indexes', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const invalidQuestion = await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      5,
      0,
      1
    );
    const invalidAnswer = await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      0,
      4,
      1
    );

    expect(invalidQuestion.status).toBe(400);
    expect(invalidQuestion.body.error).toBe('Invalid question index');
    expect(invalidAnswer.status).toBe(400);
    expect(invalidAnswer.body.error).toBe('Invalid answer index');
  });

  test('prevents an older rapid answer request from overwriting a newer selection', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const [olderResponse, newerResponse] = await Promise.all([
      saveInterviewAnswer(interview.token, interview.session._id, 0, 1, 1),
      saveInterviewAnswer(interview.token, interview.session._id, 0, 2, 2)
    ]);

    expect(olderResponse.status).toBe(200);
    expect(newerResponse.status).toBe(200);

    const savedSession = await InterviewSession.findById(interview.session._id);
    expect(savedSession.selectedAnswers.get('0')).toBe(2);
    expect(savedSession.answerVersions.get('0')).toBe(2);
  });

  test('rejects answer changes after the session is finalized', async () => {
    const interview = await createTimedInterview(60 * 1000);
    await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      0,
      interview.correctAnswers[0],
      1
    ).expect(200);
    await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    ).expect(200);

    const response = await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      0,
      (interview.correctAnswers[0] + 1) % 4,
      2
    );

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('This interview can no longer be changed');
  });

  test('supports unfinished sessions created before answer storage was added', async () => {
    const interview = await createTimedInterview(60 * 1000);
    await InterviewSession.collection.updateOne(
      { _id: interview.session._id },
      {
        $unset: {
          selectedAnswers: '',
          answerVersions: '',
          answersLockedAt: ''
        }
      }
    );

    await saveInterviewAnswer(
      interview.token,
      interview.session._id,
      0,
      interview.correctAnswers[0],
      1
    ).expect(200);

    const response = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    ).expect(200);

    expect(response.body.result).toMatchObject({ score: 1, totalQuestions: 5, percentage: 20 });
  });

  test('accepts a submission received before the deadline', async () => {
    const interview = await createTimedInterview(60 * 1000);
    await saveInterviewAnswers(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    );
    const response = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    );

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({ score: 5, totalQuestions: 5, percentage: 100 });
  });

  test('accepts an automatic submission arriving within the 10-second grace period', async () => {
    const interview = await createTimedInterview(60 * 1000);
    await Promise.all(interview.correctAnswers.map((answer, index) => (
      saveInterviewAnswer(interview.token, interview.session._id, index, answer, 1)
        .expect(200)
    )));
    await InterviewSession.updateOne(
      { _id: interview.session._id },
      { $set: { deadline: new Date(Date.now() - 5 * 1000) } }
    );

    const tamperedAnswers = interview.correctAnswers.map((answer) => (answer + 1) % 4);
    const response = await submitInterview(
      interview.token,
      interview.session._id,
      tamperedAnswers
    );

    expect(response.status).toBe(200);
    expect(response.body.result.score).toBe(5);
  });

  test('rejects a first submission arriving after the grace period with 408', async () => {
    const interview = await createTimedInterview(-11 * 1000);
    const response = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    );

    expect(response.status).toBe(408);
    expect(response.body.error).toBe('The interview time has expired');
    expect(await InterviewResult.countDocuments({ session: interview.session._id })).toBe(0);
  });

  test('returns the existing result for repeated submissions without creating duplicates', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const firstResponse = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    ).expect(200);
    const secondResponse = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    ).expect(200);
    const thirdResponse = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    ).expect(200);

    expect(secondResponse.body.result._id).toBe(firstResponse.body.result._id);
    expect(thirdResponse.body.result._id).toBe(firstResponse.body.result._id);
    expect(await InterviewResult.countDocuments({ session: interview.session._id })).toBe(1);
  });

  test('leaves the session retryable when result creation fails', async () => {
    const interview = await createTimedInterview(60 * 1000);
    await saveInterviewAnswers(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    );
    const createResult = vi.spyOn(InterviewResult, 'create')
      .mockRejectedValueOnce(new Error('Simulated result creation failure'));

    const failedResponse = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    );
    createResult.mockRestore();

    expect(failedResponse.status).toBe(500);
    expect(await InterviewResult.countDocuments({ session: interview.session._id })).toBe(0);
    expect((await InterviewSession.findById(interview.session._id)).submittedAt).toBeNull();

    const retryResponse = await submitInterview(
      interview.token,
      interview.session._id,
      interview.correctAnswers
    ).expect(200);

    expect(retryResponse.body.result).toMatchObject({
      score: 5,
      totalQuestions: 5,
      percentage: 100
    });
    expect(await InterviewResult.countDocuments({ session: interview.session._id })).toBe(1);
    expect((await InterviewSession.findById(interview.session._id)).submittedAt).not.toBeNull();
  });

  test('prevents concurrent submissions from creating two results', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const [firstResponse, secondResponse] = await Promise.all([
      submitInterview(interview.token, interview.session._id, interview.correctAnswers),
      submitInterview(interview.token, interview.session._id, interview.correctAnswers)
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body.result._id).toBe(secondResponse.body.result._id);
    expect(await InterviewResult.countDocuments({ session: interview.session._id })).toBe(1);
  });

  test('scores unanswered questions as incorrect', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const selectedAnswers = [interview.correctAnswers[0], null, null, null, null];
    await saveInterviewAnswers(
      interview.token,
      interview.session._id,
      selectedAnswers
    );
    const response = await submitInterview(
      interview.token,
      interview.session._id,
      selectedAnswers
    ).expect(200);

    expect(response.body.result).toMatchObject({ score: 1, totalQuestions: 5, percentage: 20 });
  });

  test('ignores client-supplied score values and calculates the score on the backend', async () => {
    const interview = await createTimedInterview(60 * 1000);
    const wrongAnswers = interview.correctAnswers.map((answer) => (answer + 1) % 4);
    const response = await submitInterview(
      interview.token,
      interview.session._id,
      wrongAnswers,
      { score: 5, totalQuestions: 5, percentage: 100 }
    ).expect(200);

    expect(response.body.result).toMatchObject({ score: 0, totalQuestions: 5, percentage: 0 });
  });
});
