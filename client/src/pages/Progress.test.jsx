import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import Progress from './Progress.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

const results = [
  {
    _id: 'result-1',
    category: 'Technical',
    score: 4,
    totalQuestions: 5,
    percentage: 80,
    completedAt: '2026-11-15T10:00:00.000Z'
  },
  {
    _id: 'result-2',
    category: 'Behavioral',
    score: 3,
    totalQuestions: 5,
    percentage: 60,
    completedAt: '2026-11-14T10:00:00.000Z'
  }
];

const reviewQuestion = {
  _id: 'question-review-1',
  category: 'Behavioral',
  questionText: 'Tell me about a difficult problem you solved.',
  suggestedAnswer: 'Use a clear situation, task, action, and result structure.',
  status: 'almost',
  updatedAt: '2026-11-15T09:00:00.000Z'
};

function renderProgress(overrides = {}) {
  const props = {
    refreshKey: 0,
    onReviewQuestion: vi.fn(),
    ...overrides
  };
  render(<Progress {...props} />);
  return props;
}

function mockProgressData({
  stats = { totalInterviews: 2, bestScorePercentage: 80, averageScorePercentage: 70 },
  interviewResults = results,
  reviewQuestions = [reviewQuestion]
} = {}) {
  apiFetch.mockImplementation((path) => {
    if (path === '/api/interviews/stats') return Promise.resolve({ stats });
    if (path === '/api/interviews/results') return Promise.resolve({ results: interviewResults });
    if (path === '/api/questions/review') return Promise.resolve({ questions: reviewQuestions });
    return Promise.reject(new Error('Unexpected API request'));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('My Progress', () => {
  test('shows loading states while progress requests are pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));

    renderProgress();

    expect(screen.getByText('Building your chart...')).toBeInTheDocument();
    expect(screen.getByText('Loading your review list...')).toBeInTheDocument();
    expect(screen.getByText('Loading your progress...')).toBeInTheDocument();
  });

  test('displays interview statistics, scores, and history', async () => {
    mockProgressData();
    renderProgress();

    const totalCard = screen.getByText('Total Interviews').closest('article');
    const bestCard = screen.getByText('Best Score').closest('article');
    const averageCard = screen.getByText('Average Score').closest('article');
    expect(await within(totalCard).findByText('2')).toBeInTheDocument();
    expect(within(bestCard).getByText('80%')).toBeInTheDocument();
    expect(within(averageCard).getByText('70%')).toBeInTheDocument();

    const history = screen.getByRole('heading', { name: 'Interview history' }).closest('section');
    expect(within(history).getByText('4/5')).toBeInTheDocument();
    expect(within(history).getByText('3/5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Interview score percentages over time' })).toBeInTheDocument();
  });

  test('displays questions marked for review and opens the selected question', async () => {
    mockProgressData();
    const { onReviewQuestion } = renderProgress();

    expect(await screen.findByText(reviewQuestion.questionText)).toBeInTheDocument();
    expect(screen.getByText('Almost there')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Review question/ }));

    expect(onReviewQuestion).toHaveBeenCalledWith(reviewQuestion);
  });

  test('displays empty states when no progress exists', async () => {
    mockProgressData({
      stats: { totalInterviews: 0, bestScorePercentage: 0, averageScorePercentage: 0 },
      interviewResults: [],
      reviewQuestions: []
    });
    renderProgress();

    expect(await screen.findByText('No interviews completed yet.')).toBeInTheDocument();
    expect(screen.getByText('Your review list is clear.')).toBeInTheDocument();
    expect(screen.getByText('Your score chart will appear after your first interview.')).toBeInTheDocument();
    expect(screen.queryByText('Building your chart...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading your review list...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading your progress...')).not.toBeInTheDocument();
  });

  test('displays an API error', async () => {
    apiFetch.mockRejectedValue(new Error('Could not load progress'));
    renderProgress();

    expect(await screen.findByText('Could not load progress')).toBeInTheDocument();
    expect(screen.queryByText('Building your chart...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading your review list...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading your progress...')).not.toBeInTheDocument();
  });
});
