import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import MockInterview from './MockInterview.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

const interviewQuestion = {
  _id: 'mock-question-1',
  category: 'Technical',
  questionText: 'Which hook stores component state?',
  options: ['useState', 'useEffect', 'useRef', 'useMemo']
};

const completedResult = {
  category: 'Technical',
  score: 1,
  totalQuestions: 1,
  percentage: 100
};

const invalidInterviewMessage = 'The interview could not be started because the server returned invalid question data. Please try again.';

function startResponse() {
  return {
    sessionId: 'session-123',
    deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    questions: [interviewQuestion]
  };
}

async function beginInterview() {
  fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
  await act(async () => {
    await Promise.resolve();
  });
}

function answerSaveResponse(path, options) {
  const match = path.match(/^\/api\/interviews\/session-123\/answers\/(\d+)$/);
  if (!match) return null;

  const body = JSON.parse(options.body);
  return {
    answer: {
      questionIndex: Number(match[1]),
      answerIndex: body.answerIndex,
      version: body.version
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockImplementation((path, options) => {
    if (path === '/api/interviews/start') {
      return Promise.resolve(startResponse());
    }
    const savedAnswer = answerSaveResponse(path, options);
    if (savedAnswer) return Promise.resolve(savedAnswer);
    if (path === '/api/interviews/submit') {
      return Promise.resolve({ result: completedResult });
    }
    return Promise.reject(new Error('Unexpected API request'));
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Mock Interview', () => {
  test('displays questions, records an answer, and shows the returned result', async () => {
    const onCompleted = vi.fn();
    render(<MockInterview onCompleted={onCompleted} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    expect(await screen.findByText(interviewQuestion.questionText)).toBeInTheDocument();
    const selectedAnswer = screen.getByRole('radio', { name: /useState/ });
    fireEvent.click(selectedAnswer);

    expect(selectedAnswer).toBeChecked();
    expect(screen.getByText('1 of 1 answered')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit interview' }));

    expect(await screen.findByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('You completed the Technical mock interview.')).toBeInTheDocument();
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(apiFetch).toHaveBeenCalledWith('/api/interviews/session-123/answers/0', {
      method: 'PUT',
      body: JSON.stringify({ answerIndex: 0, version: 1 })
    });
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/interviews/submit', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123' })
      }));
    });
  });

  test('starts at five minutes and counts down from the server deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    render(<MockInterview onCompleted={vi.fn()} />);

    await beginInterview();
    expect(screen.getByText('5:00')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('4:59')).toBeInTheDocument();
  });

  test('automatically submits at expiration and prevents answer changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    apiFetch.mockImplementation((path, options) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      const savedAnswer = answerSaveResponse(path, options);
      if (savedAnswer) return Promise.resolve(savedAnswer);
      if (path === '/api/interviews/submit') return new Promise(() => {});
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    const firstAnswer = screen.getByRole('radio', { name: /useState/ });
    const secondAnswer = screen.getByRole('radio', { name: /useEffect/ });
    fireEvent.click(firstAnswer);

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(firstAnswer).toBeDisabled();
    expect(secondAnswer).toBeDisabled();
    secondAnswer.click();
    expect(firstAnswer).toBeChecked();
    expect(secondAnswer).not.toBeChecked();
    expect(apiFetch).toHaveBeenCalledWith('/api/interviews/submit', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    }));
  });

  test('waits for a pending answer save before submitting', async () => {
    let resolveAnswerSave;
    apiFetch.mockImplementation((path, options) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path.includes('/answers/')) {
        return new Promise((resolve) => {
          resolveAnswerSave = () => resolve(answerSaveResponse(path, options));
        });
      }
      if (path === '/api/interviews/submit') {
        return Promise.resolve({ result: completedResult });
      }
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    fireEvent.click(screen.getByRole('radio', { name: /useState/ }));
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit interview' }));

    expect(apiFetch.mock.calls.filter(([path]) => path === '/api/interviews/submit')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();

    await act(async () => {
      resolveAnswerSave();
      await Promise.resolve();
    });

    expect(await screen.findByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(apiFetch.mock.calls.filter(([path]) => path === '/api/interviews/submit')).toHaveLength(1);
  });

  test('proceeds with submission when an answer save never resolves', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path.includes('/answers/')) return new Promise(() => {});
      if (path === '/api/interviews/submit') return Promise.resolve({ result: completedResult });
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    fireEvent.click(screen.getByRole('radio', { name: /useState/ }));
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit interview' }));

    await act(async () => {
      vi.advanceTimersByTime(999);
      await Promise.resolve();
    });
    expect(apiFetch.mock.calls.filter(([path]) => path === '/api/interviews/submit')).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(apiFetch.mock.calls.filter(([path]) => path === '/api/interviews/submit')).toHaveLength(1);
  });

  test('automatically submits at 00:00 even when an answer save never resolves', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path.includes('/answers/')) return new Promise(() => {});
      if (path === '/api/interviews/submit') return Promise.resolve({ result: completedResult });
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    fireEvent.click(screen.getByRole('radio', { name: /useState/ }));
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(apiFetch.mock.calls.filter(([path]) => path === '/api/interviews/submit')).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
  });

  test('shows a clear error and enables retry when submission times out', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path === '/api/interviews/submit') return new Promise(() => {});
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    fireEvent.click(screen.getByRole('button', { name: 'Submit interview' }));
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(screen.getByText('Interview submission timed out. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit interview' })).toBeEnabled();
  });

  test('successfully retries after an automatic submission times out', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    let submissionAttempts = 0;
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path === '/api/interviews/submit') {
        submissionAttempts += 1;
        if (submissionAttempts === 1) return new Promise(() => {});
        return Promise.resolve({ result: completedResult });
      }
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(screen.getByText('Interview submission timed out. Please try again.')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Submit interview' });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(submissionAttempts).toBe(2);
  });

  test('shows a failed answer save and restores the last confirmed selection', async () => {
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path.includes('/answers/')) return Promise.reject(new Error('Temporary network error'));
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    const answer = screen.getByRole('radio', { name: /useState/ });
    fireEvent.click(answer);

    expect(await screen.findByText('Your answer could not be saved: Temporary network error')).toBeInTheDocument();
    expect(answer).not.toBeChecked();
    expect(screen.getByText('0 of 1 answered')).toBeInTheDocument();
  });

  test('displays an API error when the interview cannot start', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Could not start interview'));
    render(<MockInterview onCompleted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    expect(await screen.findByText('Could not start interview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Starting...' })).not.toBeInTheDocument();
  });

  test('rejects an empty question list without entering the interview', async () => {
    apiFetch.mockResolvedValueOnce({
      sessionId: 'empty-session',
      deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      questions: []
    });
    render(<MockInterview onCompleted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    expect(await screen.findByText(invalidInterviewMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeEnabled();
    expect(screen.queryByText('0 of 0 answered')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  test('rejects a response with missing questions and allows another start attempt', async () => {
    apiFetch
      .mockResolvedValueOnce({
        sessionId: 'missing-questions-session',
        deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .mockResolvedValueOnce(startResponse());
    render(<MockInterview onCompleted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    expect(await screen.findByText(invalidInterviewMessage)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Start interview' });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);

    expect(await screen.findByText(interviewQuestion.questionText)).toBeInTheDocument();
    expect(screen.queryByText(invalidInterviewMessage)).not.toBeInTheDocument();
  });

  test('rejects malformed question fields and answer options', async () => {
    apiFetch.mockResolvedValueOnce({
      sessionId: 'malformed-question-session',
      deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      questions: [{
        _id: 'malformed-question',
        questionText: 'This question has invalid options',
        options: ['Valid option', null]
      }]
    });
    render(<MockInterview onCompleted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));

    expect(await screen.findByText(invalidInterviewMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeEnabled();
    expect(screen.queryByText('This question has invalid options')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  test('displays a submission error and keeps the active interview available', async () => {
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path === '/api/interviews/submit') {
        return Promise.reject(new Error('Could not submit interview'));
      }
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    fireEvent.click(screen.getByRole('button', { name: 'Submit interview' }));

    expect(await screen.findByText('Could not submit interview')).toBeInTheDocument();
    expect(screen.getByText(interviewQuestion.questionText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit interview' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Submitting...' })).not.toBeInTheDocument();
  });

  test('automatically submits at expiration after an earlier manual submission fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    let submissionAttempts = 0;
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path === '/api/interviews/submit') {
        submissionAttempts += 1;
        if (submissionAttempts === 1) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({ result: completedResult });
      }
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    fireEvent.click(screen.getByRole('button', { name: 'Submit interview' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Temporary network error')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(submissionAttempts).toBe(2);
  });

  test('allows retry when a pending manual submission fails after the deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    let rejectFirstSubmission;
    let submissionAttempts = 0;
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path === '/api/interviews/submit') {
        submissionAttempts += 1;
        if (submissionAttempts === 1) {
          return new Promise((resolve, reject) => {
            rejectFirstSubmission = reject;
          });
        }
        return Promise.resolve({ result: completedResult });
      }
      return Promise.reject(new Error('Unexpected API request'));
    });
    render(<MockInterview onCompleted={vi.fn()} />);
    await beginInterview();

    act(() => {
      vi.advanceTimersByTime(299 * 1000);
    });
    const submitButton = screen.getByRole('button', { name: 'Submit interview' });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    await act(async () => {
      await Promise.resolve();
    });
    expect(submissionAttempts).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      rejectFirstSubmission(new Error('Temporary network error'));
      await Promise.resolve();
    });

    expect(screen.getByText('Temporary network error')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Submit interview' });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(submissionAttempts).toBe(2);
  });

  test('allows retry after an automatic submission fails at expiration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    let submissionAttempts = 0;
    apiFetch.mockImplementation((path) => {
      if (path === '/api/interviews/start') return Promise.resolve(startResponse());
      if (path === '/api/interviews/submit') {
        submissionAttempts += 1;
        if (submissionAttempts === 1) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({ result: completedResult });
      }
      return Promise.reject(new Error('Unexpected API request'));
    });
    const onCompleted = vi.fn();
    render(<MockInterview onCompleted={onCompleted} />);
    await beginInterview();

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });

    expect(screen.getByText('Temporary network error')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Submit interview' });
    expect(retryButton).toBeEnabled();

    fireEvent.click(retryButton);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '1 out of 1' })).toBeInTheDocument();
    expect(submissionAttempts).toBe(2);
    expect(onCompleted).toHaveBeenCalledOnce();
  });
});
