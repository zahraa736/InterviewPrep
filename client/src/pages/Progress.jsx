import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import ScoreLineChart from '../components/ScoreLineChart.jsx';

function formatDate(date) {
  return new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function getCategoryAverage(results, category) {
  const categoryResults = results.filter((result) => result.category === category);

  if (categoryResults.length === 0) {
    return { average: 0, count: 0 };
  }

  const total = categoryResults.reduce((sum, result) => sum + result.percentage, 0);
  return {
    average: Math.round(total / categoryResults.length),
    count: categoryResults.length
  };
}

function getMotivationalMessage(results, averageScore, bestScore) {
  if (results.length === 0) {
    return 'Complete your first mock interview to begin your growth journey.';
  }

  const latestScore = results[0].percentage;

  if (results.length > 1 && latestScore === bestScore) {
    return 'New personal best! Your consistent practice is paying off. ✨';
  }

  if (averageScore >= 80) {
    return 'Excellent consistency—you are performing above your goal.';
  }

  if (latestScore > averageScore) {
    return 'You are building momentum—your latest score is above your average.';
  }

  return 'Every interview is useful practice. Keep going and trust your progress.';
}

function Progress({ refreshKey, onReviewQuestion }) {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignoreResponse = false;

    async function loadProgress() {
      setLoading(true);
      setError('');

      try {
        const [statsData, resultsData, reviewData] = await Promise.all([
          apiFetch('/api/interviews/stats'),
          apiFetch('/api/interviews/results'),
          apiFetch('/api/questions/review')
        ]);

        if (!ignoreResponse) {
          setStats(statsData.stats);
          setResults(resultsData.results);
          setReviewQuestions(reviewData.questions);
        }
      } catch (error) {
        if (!ignoreResponse) {
          setError(error.message);
        }
      } finally {
        if (!ignoreResponse) {
          setLoading(false);
        }
      }
    }

    loadProgress();
    return () => {
      ignoreResponse = true;
    };
  }, [refreshKey]);

  const latestScore = results.length > 0 ? results[0].percentage : 0;
  const bestScore = results.length > 0
    ? Math.max(...results.map((result) => result.percentage))
    : 0;
  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, result) => sum + result.percentage, 0) / results.length)
    : 0;
  const goalReached = latestScore >= 80;
  const categoryProgress = ['Technical', 'Behavioral', 'General'].map((category) => ({
    category,
    ...getCategoryAverage(results, category)
  }));
  const motivationalMessage = getMotivationalMessage(results, averageScore, bestScore);

  return (
    <div className="progress-page">
      <header className="progress-header">
        <p className="eyebrow">Your journey</p>
        <h1>My Progress</h1>
        <p>Review your mock interview performance and watch your confidence grow over time.</p>
      </header>

      {error && <p className="error-message progress-error">{error}</p>}

      <div className="progress-stats-grid">
        <article className="progress-stat-card">
          <div className="stat-icon interview-icon" aria-hidden="true">◉</div>
          <span>Total Interviews</span>
          <strong>{loading ? '—' : stats?.totalInterviews ?? 0}</strong>
        </article>

        <article className="progress-stat-card">
          <div className="stat-icon questions-icon" aria-hidden="true">★</div>
          <span>Best Score</span>
          <strong>
            {loading || !stats?.totalInterviews ? '—' : `${stats.bestScorePercentage}%`}
          </strong>
        </article>

        <article className="progress-stat-card">
          <div className="stat-icon progress-icon" aria-hidden="true">↗</div>
          <span>Average Score</span>
          <strong>
            {loading || !stats?.totalInterviews ? '—' : `${stats.averageScorePercentage}%`}
          </strong>
        </article>
      </div>

      <section className="growth-journey" aria-labelledby="growth-title">
        <div className="progress-section-heading growth-heading">
          <div>
            <p className="eyebrow">Keep moving forward</p>
            <h2 id="growth-title">Your Growth Journey ✨</h2>
          </div>
          {!loading && results.length > 0 && <span>{results.length} data points</span>}
        </div>

        <div className="motivation-banner">
          <div aria-hidden="true">✦</div>
          <p>{loading ? 'Preparing your progress story...' : motivationalMessage}</p>
        </div>

        <div className="growth-layout">
          <article className="score-chart-card">
            <div className="growth-card-heading">
              <div>
                <h3>Score over time</h3>
                <p>Each point represents one completed interview.</p>
              </div>
              <span className="chart-legend"><i></i> Score</span>
            </div>

            {loading ? (
              <div className="growth-loading">Building your chart...</div>
            ) : results.length === 0 ? (
              <div className="growth-empty">
                <span aria-hidden="true">↗</span>
                <p>Your score chart will appear after your first interview.</p>
              </div>
            ) : (
              <ScoreLineChart results={results} />
            )}
          </article>

          <div className="growth-insights">
            <article className="personal-best-card">
              <div className="insight-icon trophy-icon" aria-hidden="true">🏆</div>
              <div>
                <span>Personal Best</span>
                <strong>{loading || results.length === 0 ? '—' : `${bestScore}%`}</strong>
                <p>{results.length === 0 ? 'Your best score will appear here.' : 'Your highest interview score so far.'}</p>
              </div>
            </article>

            <article className="goal-tracker-card">
              <div className="growth-card-heading">
                <div>
                  <span className="goal-label">Goal Tracker 🎯</span>
                  <h3>Reach an 80% score</h3>
                </div>
                <strong>{results.length === 0 ? '—' : `${latestScore}%`}</strong>
              </div>

              <div className="goal-progress" role="progressbar" aria-label="Latest score toward 80 percent goal" aria-valuemin="0" aria-valuemax="100" aria-valuenow={latestScore}>
                <span style={{ width: `${Math.min(latestScore, 100)}%` }}></span>
                <i style={{ left: '80%' }}></i>
              </div>

              <p>
                {results.length === 0
                  ? 'Complete an interview to start tracking this goal.'
                  : goalReached
                    ? 'Goal reached—wonderful work! Keep the momentum going. ✨'
                    : `${80 - latestScore} percentage points to go. You can do it!`}
              </p>
            </article>
          </div>
        </div>

        <article className="category-progress-card">
          <div className="growth-card-heading">
            <div>
              <h3>Category Progress</h3>
              <p>Your average score in each interview category.</p>
            </div>
          </div>

          <div className="category-progress-list">
            {categoryProgress.map((item) => (
              <div className="category-progress-item" key={item.category}>
                <div className="category-progress-info">
                  <span>{item.category}</span>
                  <small>{item.count === 0 ? 'No interviews yet' : `${item.count} completed`}</small>
                  <strong>{item.count === 0 ? '—' : `${item.average}%`}</strong>
                </div>
                <div className="category-progress-track">
                  <span style={{ width: `${item.average}%` }}></span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="questions-review-section" aria-labelledby="questions-review-title">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">Personalized practice</p>
            <h2 id="questions-review-title">Questions to Review</h2>
          </div>
          {!loading && reviewQuestions.length > 0 && <span>{reviewQuestions.length} to revisit</span>}
        </div>

        {loading ? (
          <div className="progress-loading">Loading your review list...</div>
        ) : reviewQuestions.length === 0 ? (
          <div className="review-empty-state">
            <div className="empty-state-icon" aria-hidden="true">✓</div>
            <h3>Your review list is clear.</h3>
            <p>Questions marked “Almost there” or “Need more practice” will appear here.</p>
          </div>
        ) : (
          <div className="review-question-list">
            {reviewQuestions.map((question) => (
              <article className={`review-question-card review-${question.status}`} key={question._id}>
                <div className="review-question-content">
                  <div className="review-question-meta">
                    <span>{question.category}</span>
                    <strong>
                      {question.status === 'almost' ? 'Almost there' : 'Need more practice'}
                    </strong>
                  </div>
                  <h3>{question.questionText}</h3>
                </div>
                <button type="button" onClick={() => onReviewQuestion(question)}>
                  Review question <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="progress-history" aria-labelledby="history-title">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">Completed interviews</p>
            <h2 id="history-title">Interview history</h2>
          </div>
          {!loading && results.length > 0 && <span>{results.length} total</span>}
        </div>

        {loading ? (
          <div className="progress-loading">Loading your progress...</div>
        ) : results.length === 0 ? (
          <div className="progress-empty-state">
            <div className="empty-state-icon" aria-hidden="true">◎</div>
            <h3>No interviews completed yet.</h3>
            <p>Complete a mock interview and your results will appear here.</p>
          </div>
        ) : (
          <div className="history-list">
            {results.map((result) => (
              <article className="history-item" key={result._id}>
                <div className="history-category-icon" aria-hidden="true">
                  {result.category === 'Technical' ? '</>' : result.category === 'Behavioral' ? '◇' : '✦'}
                </div>
                <div className="history-details">
                  <h3>{result.category}</h3>
                  <time dateTime={result.completedAt}>{formatDate(result.completedAt)}</time>
                </div>
                <div className="history-score">
                  <strong>{result.score}/{result.totalQuestions}</strong>
                  <span>{result.percentage}%</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Progress;
