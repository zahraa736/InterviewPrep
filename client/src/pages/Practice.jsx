import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client.js';

const categories = ['Technical', 'Behavioral', 'General'];

const assessmentOptions = [
  { status: 'got_it', label: 'I got it!', icon: '✓' },
  { status: 'almost', label: 'Almost there', icon: '↗' },
  { status: 'review', label: 'Need more practice', icon: '↻' }
];

function getAssessmentLabel(status) {
  return assessmentOptions.find((option) => option.status === status)?.label;
}

function Practice({ initialCategory = 'Technical', initialQuestionId = null }) {
  const questionToOpen = useRef(initialQuestionId);
  const [category, setCategory] = useState(initialCategory);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [progress, setProgress] = useState({});
  const [showSuggestedAnswer, setShowSuggestedAnswer] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignoreResponse = false;

    async function loadQuestions() {
      setLoading(true);
      setError('');
      setCurrentIndex(0);
      setShowSuggestedAnswer(false);
      setShowAssessment(false);
      setAssessmentError('');

      try {
        const [questionsData, progressData] = await Promise.all([
          apiFetch(`/api/questions?category=${encodeURIComponent(category)}`),
          apiFetch('/api/questions/progress')
        ]);

        if (!ignoreResponse) {
          setQuestions(questionsData.questions);
          setProgress(Object.fromEntries(
            progressData.progress.map((item) => [item.question, item.status])
          ));

          if (questionToOpen.current) {
            const selectedIndex = questionsData.questions.findIndex(
              (question) => question._id === questionToOpen.current
            );
            if (selectedIndex >= 0) setCurrentIndex(selectedIndex);
            questionToOpen.current = null;
          }
        }
      } catch (requestError) {
        if (!ignoreResponse) {
          setQuestions([]);
          setError(requestError.message);
        }
      } finally {
        if (!ignoreResponse) setLoading(false);
      }
    }

    loadQuestions();
    return () => {
      ignoreResponse = true;
    };
  }, [category]);

  const currentQuestion = questions[currentIndex];
  const currentStatus = currentQuestion ? progress[currentQuestion._id] : null;

  function changeQuestion(newIndex) {
    setCurrentIndex(newIndex);
    setShowSuggestedAnswer(false);
    setShowAssessment(false);
    setAssessmentError('');
  }

  function changeCategory(newCategory) {
    questionToOpen.current = null;
    setCategory(newCategory);
  }

  function checkAnswer() {
    setShowSuggestedAnswer(true);
    setShowAssessment(true);
    setAssessmentError('');
  }

  async function saveAssessment(status) {
    setSavingAssessment(true);
    setAssessmentError('');

    try {
      const data = await apiFetch(`/api/questions/${currentQuestion._id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      setProgress((currentProgress) => ({
        ...currentProgress,
        [currentQuestion._id]: data.progress.status
      }));
    } catch (requestError) {
      setAssessmentError(requestError.message);
    } finally {
      setSavingAssessment(false);
    }
  }

  async function resetProgress() {
    setResettingProgress(true);
    setAssessmentError('');

    try {
      await apiFetch(`/api/questions/${currentQuestion._id}/progress`, {
        method: 'DELETE'
      });

      setProgress((currentProgress) => {
        const updatedProgress = { ...currentProgress };
        delete updatedProgress[currentQuestion._id];
        return updatedProgress;
      });
    } catch (requestError) {
      setAssessmentError(requestError.message);
    } finally {
      setResettingProgress(false);
    }
  }

  return (
    <div className="practice-page">
      <header className="practice-header">
        <p className="eyebrow">Question library</p>
        <h1>Practice Questions</h1>
        <p>Write your answer, compare it with a suggested approach, and assess your own understanding.</p>
      </header>

      <div className="category-tabs" aria-label="Question categories">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? 'active' : ''}
            aria-pressed={category === item}
            onClick={() => changeCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="practice-state">Loading questions...</div>
      ) : error ? (
        <div className="practice-state error-message">{error}</div>
      ) : !currentQuestion ? (
        <div className="practice-state">No questions are available in this category yet.</div>
      ) : (
        <section className="question-card">
          <div className="question-meta">
            <span className="question-category">{currentQuestion.category}</span>
            <span>Question {currentIndex + 1} of {questions.length}</span>
          </div>

          <div className="question-title-row">
            <h2>{currentQuestion.questionText}</h2>
            {currentStatus && (
              <span className={`saved-assessment assessment-${currentStatus}`}>
                {getAssessmentLabel(currentStatus)}
              </span>
            )}
          </div>

          <label htmlFor="practice-answer">Your answer</label>
          <textarea
            id="practice-answer"
            value={answers[currentQuestion._id] || ''}
            onChange={(event) => {
              setAnswers((currentAnswers) => ({
                ...currentAnswers,
                [currentQuestion._id]: event.target.value
              }));
            }}
            placeholder="Write your answer here..."
            rows="7"
          />

          <div className="answer-actions">
            <button type="button" className="check-answer-button" onClick={checkAnswer}>
              Check My Answer
            </button>
            <button
              type="button"
              className="suggested-answer-button"
              onClick={() => setShowSuggestedAnswer(!showSuggestedAnswer)}
            >
              {showSuggestedAnswer ? 'Hide suggested answer' : 'Show suggested answer'}
            </button>
            {currentStatus && (
              <button
                type="button"
                className="reset-progress-button"
                disabled={savingAssessment || resettingProgress}
                onClick={resetProgress}
              >
                {resettingProgress ? 'Resetting...' : 'Reset Progress'}
              </button>
            )}
          </div>

          {assessmentError && !showAssessment && (
            <p className="assessment-error" role="alert">{assessmentError}</p>
          )}

          {showSuggestedAnswer && (
            <div className="suggested-answer">
              <h3>Suggested answer</h3>
              <p>{currentQuestion.suggestedAnswer}</p>
            </div>
          )}

          {showAssessment && (
            <div className="self-assessment" aria-labelledby="assessment-title">
              <div>
                <p className="eyebrow">Your reflection</p>
                <h3 id="assessment-title">How well did you understand this question?</h3>
                <p>Compare the answers and choose the option that feels most accurate.</p>
              </div>

              <div className="assessment-buttons">
                {assessmentOptions.map((option) => (
                  <button
                    type="button"
                    key={option.status}
                    className={`${option.status} ${currentStatus === option.status ? 'selected' : ''}`}
                    aria-pressed={currentStatus === option.status}
                    disabled={savingAssessment || resettingProgress}
                    onClick={() => saveAssessment(option.status)}
                  >
                    <span aria-hidden="true">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>

              {assessmentError && <p className="assessment-error" role="alert">{assessmentError}</p>}
              {savingAssessment && <p className="assessment-saving" role="status">Saving your assessment...</p>}
            </div>
          )}

          <div className="question-navigation">
            <button
              type="button"
              onClick={() => changeQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => changeQuestion(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
            >
              Next →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default Practice;
