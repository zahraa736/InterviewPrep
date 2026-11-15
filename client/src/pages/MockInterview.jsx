import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client.js';

const categories = ['Technical', 'Behavioral', 'General'];
const invalidInterviewMessage = 'The interview could not be started because the server returned invalid question data. Please try again.';
const pendingAnswerWaitMs = 1000;
const submissionTimeoutMs = 4000;

async function waitForPendingAnswers(pendingAnswers) {
  if (pendingAnswers.length === 0) return;

  let timeoutId;
  try {
    await Promise.race([
      Promise.allSettled(pendingAnswers),
      new Promise((resolve) => {
        timeoutId = window.setTimeout(resolve, pendingAnswerWaitMs);
      })
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function submitWithTimeout(sessionId) {
  const controller = new AbortController();
  let timeoutId;

  try {
    return await Promise.race([
      apiFetch('/api/interviews/submit', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
        signal: controller.signal
      }),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error('Interview submission timed out. Please try again.'));
        }, submissionTimeoutMs);
      })
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isValidStartResponse(data) {
  return Boolean(
    data &&
    typeof data.sessionId === 'string' &&
    data.sessionId.trim() &&
    typeof data.deadline === 'string' &&
    Number.isFinite(new Date(data.deadline).getTime()) &&
    Array.isArray(data.questions) &&
    data.questions.length > 0 &&
    data.questions.every((question) => (
      question &&
      typeof question._id === 'string' &&
      question._id.trim() &&
      typeof question.questionText === 'string' &&
      question.questionText.trim() &&
      Array.isArray(question.options) &&
      question.options.length > 0 &&
      question.options.every((option) => typeof option === 'string' && option.trim())
    ))
  );
}

function MockInterview({ onCompleted }) {
  const [category, setCategory] = useState('Technical');
  const [phase, setPhase] = useState('setup');
  const [sessionId, setSessionId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canRetryExpiredSubmission, setCanRetryExpiredSubmission] = useState(false);
  const [error, setError] = useState('');
  const automaticSubmitStarted = useRef(false);
  const submissionPending = useRef(false);
  const answerVersions = useRef({});
  const confirmedAnswers = useRef({});
  const answerSaveChains = useRef({});
  const pendingAnswerSaves = useRef(new Set());

  async function startInterview() {
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/api/interviews/start', {
        method: 'POST',
        body: JSON.stringify({ category })
      });

      if (!isValidStartResponse(data)) {
        throw new Error(invalidInterviewMessage);
      }

      setSessionId(data.sessionId);
      setDeadline(data.deadline);
      setQuestions(data.questions);
      setSelectedAnswers({});
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(data.deadline).getTime() - Date.now()) / 1000)));
      setResult(null);
      setCanRetryExpiredSubmission(false);
      automaticSubmitStarted.current = false;
      answerVersions.current = {};
      confirmedAnswers.current = {};
      answerSaveChains.current = {};
      pendingAnswerSaves.current.clear();
      setPhase('interview');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(questionIndex, answerIndex) {
    const question = questions[questionIndex];
    const questionId = question._id;
    const version = (answerVersions.current[questionId] ?? 0) + 1;
    answerVersions.current[questionId] = version;
    setError('');
    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answerIndex
    }));

    const previousSave = answerSaveChains.current[questionId] ?? Promise.resolve();
    let saveRequest;
    saveRequest = previousSave
      .catch(() => undefined)
      .then(() => apiFetch(`/api/interviews/${sessionId}/answers/${questionIndex}`, {
        method: 'PUT',
        body: JSON.stringify({ answerIndex, version })
      }))
      .then((data) => {
        const savedAnswer = data.answer;
        confirmedAnswers.current[questionId] = savedAnswer.answerIndex;

        if (answerVersions.current[questionId] === savedAnswer.version) {
          setSelectedAnswers((currentAnswers) => ({
            ...currentAnswers,
            [questionId]: savedAnswer.answerIndex
          }));
        }
      })
      .catch((requestError) => {
        if (answerVersions.current[questionId] === version) {
          setSelectedAnswers((currentAnswers) => {
            const updatedAnswers = { ...currentAnswers };
            const confirmedAnswer = confirmedAnswers.current[questionId];

            if (confirmedAnswer === undefined || confirmedAnswer === null) {
              delete updatedAnswers[questionId];
            } else {
              updatedAnswers[questionId] = confirmedAnswer;
            }
            return updatedAnswers;
          });
          setError(`Your answer could not be saved: ${requestError.message}`);
        }
      })
      .finally(() => {
        pendingAnswerSaves.current.delete(saveRequest);
        if (answerSaveChains.current[questionId] === saveRequest) {
          delete answerSaveChains.current[questionId];
        }
      });

    answerSaveChains.current[questionId] = saveRequest;
    pendingAnswerSaves.current.add(saveRequest);
  }

  const submitInterview = useCallback(async (isAutomatic = false) => {
    if (!sessionId || submissionPending.current || phase !== 'interview') {
      return;
    }

    submissionPending.current = true;
    if (isAutomatic) automaticSubmitStarted.current = true;
    setSubmitting(true);
    setError('');

    try {
      await waitForPendingAnswers([...pendingAnswerSaves.current]);
      const data = await submitWithTimeout(sessionId);

      setResult(data.result);
      setCanRetryExpiredSubmission(false);
      setPhase('result');
      onCompleted();
    } catch (error) {
      setError(error.message);
      const deadlineReached = Date.now() >= new Date(deadline).getTime();

      if (isAutomatic || deadlineReached) {
        automaticSubmitStarted.current = true;
        setCanRetryExpiredSubmission(true);
      } else {
        automaticSubmitStarted.current = false;
      }
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  }, [deadline, onCompleted, phase, sessionId]);

  useEffect(() => {
    if (phase !== 'interview' || !deadline) {
      return undefined;
    }

    function updateCountdown() {
      const seconds = Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, seconds));
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [deadline, phase]);

  useEffect(() => {
    if (
      phase === 'interview' &&
      remainingSeconds === 0 &&
      !automaticSubmitStarted.current
    ) {
      submitInterview(true);
    }
  }, [phase, remainingSeconds, submitInterview]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const answeredCount = Object.keys(selectedAnswers).length;

  if (phase === 'result' && result) {
    return (
      <section className="interview-result">
        <div className="result-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">Interview complete</p>
        <h1>{result.score} out of {result.totalQuestions}</h1>
        <div className="result-percentage">{result.percentage}%</div>
        <p>You completed the {result.category} mock interview.</p>
        <button
          type="button"
          onClick={() => {
            setPhase('setup');
            setError('');
          }}
        >
          Try another interview
        </button>
      </section>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="mock-setup">
        <header className="mock-header">
          <p className="eyebrow">Timed practice</p>
          <h1>Mock Interview</h1>
          <p>Answer five multiple-choice questions in five minutes. Your score is calculated securely by the server.</p>
        </header>

        <section className="mock-setup-card">
          <h2>Choose a category</h2>
          <div className="mock-category-grid">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? 'active' : ''}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                <span className="mock-category-icon" aria-hidden="true">
                  {item === 'Technical' ? '</>' : item === 'Behavioral' ? '◇' : '✦'}
                </span>
                <span>{item}</span>
              </button>
            ))}
          </div>

          <div className="mock-details">
            <span>5 questions</span>
            <span>5 minutes</span>
            <span>One submission</span>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="button" className="start-interview-button" onClick={startInterview} disabled={loading}>
            {loading ? 'Starting...' : 'Start interview'}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mock-interview-page">
      <header className="interview-toolbar">
        <div>
          <p className="eyebrow">{category} interview</p>
          <h1>Mock Interview</h1>
        </div>
        <div className={`interview-timer ${remainingSeconds <= 60 ? 'timer-warning' : ''}`}>
          <span aria-hidden="true">◷</span>
          <strong>{minutes}:{String(seconds).padStart(2, '0')}</strong>
        </div>
      </header>

      <div className="interview-progress">
        <span>{answeredCount} of {questions.length} answered</span>
        <div>
          <span style={{ width: `${(answeredCount / questions.length) * 100}%` }}></span>
        </div>
      </div>

      {error && <p className="error-message interview-error">{error}</p>}

      <div className="mock-question-list">
        {questions.map((question, questionIndex) => (
          <section className="mock-question-card" key={question._id}>
            <div className="mock-question-number">Question {questionIndex + 1}</div>
            <h2>{question.questionText}</h2>

            <div className="answer-options">
              {question.options.map((option, optionIndex) => (
                <label
                  key={option}
                  className={selectedAnswers[question._id] === optionIndex ? 'selected' : ''}
                >
                  <input
                    type="radio"
                    name={`question-${question._id}`}
                    value={optionIndex}
                    checked={selectedAnswers[question._id] === optionIndex}
                    disabled={remainingSeconds === 0 || submitting}
                    onChange={() => selectAnswer(questionIndex, optionIndex)}
                  />
                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="submit-interview-bar">
        <div>
          <strong>{answeredCount} / {questions.length}</strong>
          <span> questions answered</span>
        </div>
        <button
          type="button"
          onClick={() => submitInterview(false)}
          disabled={submitting || (remainingSeconds === 0 && !canRetryExpiredSubmission)}
        >
          {submitting ? 'Submitting...' : 'Submit interview'}
        </button>
      </div>
    </div>
  );
}

export default MockInterview;
