import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import Dashboard from './Dashboard.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

const dashboardProps = {
  user: { name: 'Zahraa Student' },
  onNavigate: vi.fn(),
  onPractice: vi.fn(),
  refreshKey: 0
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  test('shows its loading state while dashboard requests are pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));

    render(<Dashboard {...dashboardProps} />);

    expect(screen.getByText('Loading your progress...')).toBeInTheDocument();
  });

  test('displays statistics and recent results returned by the API', async () => {
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/stats') {
        return Promise.resolve({
          stats: {
            totalPracticeQuestions: 42,
            totalInterviews: 3,
            bestScorePercentage: 90,
            averageScorePercentage: 75
          }
        });
      }
      if (path === '/api/interviews/results') {
        return Promise.resolve({
          results: [{
            _id: 'result-1',
            percentage: 80,
            completedAt: '2026-11-15T10:00:00.000Z'
          }]
        });
      }
      return Promise.reject(new Error('Unexpected API request'));
    });

    render(<Dashboard {...dashboardProps} />);

    const statistics = await screen.findByLabelText('Your interview preparation statistics');
    expect(within(statistics).getByText('42')).toBeInTheDocument();
    expect(within(statistics).getByText('3')).toBeInTheDocument();
    expect(within(statistics).getByText('90%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Interview score percentages over time' })).toBeInTheDocument();
    expect(screen.queryByText('Loading your progress...')).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/api/interviews/stats');
    expect(apiFetch).toHaveBeenCalledWith('/api/interviews/results');
  });

  test('displays an API error and removes the loading indicator', async () => {
    apiFetch.mockRejectedValue(new Error('Could not load dashboard data'));

    render(<Dashboard {...dashboardProps} />);

    expect(await screen.findByText('Could not load dashboard data')).toBeInTheDocument();
    expect(screen.queryByText('Loading your progress...')).not.toBeInTheDocument();
  });

  test('displays empty statistics and guidance when no interviews exist', async () => {
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/stats') {
        return Promise.resolve({
          stats: {
            totalPracticeQuestions: 0,
            totalInterviews: 0,
            bestScorePercentage: 0,
            averageScorePercentage: 0
          }
        });
      }
      if (path === '/api/interviews/results') return Promise.resolve({ results: [] });
      return Promise.reject(new Error('Unexpected API request'));
    });

    render(<Dashboard {...dashboardProps} />);

    expect(await screen.findByText('Your journey starts here')).toBeInTheDocument();
    expect(screen.getByText('Complete a mock interview to see your progress chart.')).toBeInTheDocument();
    expect(screen.getByText('Take your first interview to begin tracking this goal.')).toBeInTheDocument();
    expect(screen.queryByText('Loading your progress...')).not.toBeInTheDocument();
  });
});
