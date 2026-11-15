import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import Practice from './Practice.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

const question = {
  _id: 'question-123',
  category: 'Technical',
  questionText: 'What is React state?',
  suggestedAnswer: 'State stores data that can change while a component is rendered.'
};

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockImplementation((path, options) => {
    if (path.startsWith('/api/questions?')) {
      return Promise.resolve({ questions: [question] });
    }
    if (path === '/api/questions/progress') {
      return Promise.resolve({
        progress: [{ question: question._id, status: 'almost' }]
      });
    }
    if (path === `/api/questions/${question._id}/progress` && options?.method === 'DELETE') {
      return Promise.resolve({ message: 'Question progress reset successfully' });
    }
    return Promise.reject(new Error('Unexpected API request'));
  });
});

describe('Practice questions', () => {
  test('shows a loading state while questions and progress are being requested', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));

    render(<Practice />);

    expect(screen.getByText('Loading questions...')).toBeInTheDocument();
  });

  test('shows the saved status and reset action for a question with progress', async () => {
    render(<Practice />);

    expect(await screen.findByText('Almost there')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Progress' })).toBeInTheDocument();
  });

  test('deletes the current question progress and immediately removes its saved controls', async () => {
    render(<Practice />);

    expect(await screen.findByText('Almost there')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Progress' }));

    await waitFor(() => {
      expect(screen.queryByText('Almost there')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reset Progress' })).not.toBeInTheDocument();
    });
    expect(apiFetch).toHaveBeenCalledWith(`/api/questions/${question._id}/progress`, {
      method: 'DELETE'
    });
  });

  test('displays a loading failure and removes the loading indicator', async () => {
    apiFetch.mockRejectedValue(new Error('Could not load practice questions'));

    render(<Practice />);

    expect(await screen.findByText('Could not load practice questions')).toBeInTheDocument();
    expect(screen.queryByText('Loading questions...')).not.toBeInTheDocument();
  });

  test('displays the category empty state when no questions are returned', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.startsWith('/api/questions?')) return Promise.resolve({ questions: [] });
      if (path === '/api/questions/progress') return Promise.resolve({ progress: [] });
      return Promise.reject(new Error('Unexpected API request'));
    });

    render(<Practice />);

    expect(await screen.findByText('No questions are available in this category yet.')).toBeInTheDocument();
    expect(screen.queryByText('Loading questions...')).not.toBeInTheDocument();
  });
});
