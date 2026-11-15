import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import ScoreLineChart from '../components/ScoreLineChart.jsx';

function Dashboard({ user, onNavigate, onPractice, refreshKey }) {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    let ignoreResponse = false;

    async function loadDashboardData() {
      setLoadingData(true);
      setDataError('');

      try {
        const [statsData, resultsData] = await Promise.all([
          apiFetch('/api/interviews/stats'),
          apiFetch('/api/interviews/results')
        ]);

        if (!ignoreResponse) {
          setStats(statsData.stats);
          setResults(resultsData.results);
        }
      } catch (error) {
        if (!ignoreResponse) {
          setDataError(error.message);
        }
      } finally {
        if (!ignoreResponse) {
          setLoadingData(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      ignoreResponse = true;
    };
  }, [refreshKey]);

  const firstName = user.name.trim().split(/\s+/)[0];
  const latestScore = results.length > 0 ? results[0].percentage : 0;
  const recentChartResults = results.slice(0, 7);
  const goalReached = latestScore >= 80;
  const achievementList = [
    {
      title: 'First Step',
      description: 'Complete 1 interview',
      icon: '✦',
      unlocked: results.length >= 1
    },
    {
      title: 'Getting Started',
      description: 'Complete 3 interviews',
      icon: '↗',
      unlocked: results.length >= 3
    },
    {
      title: 'High Achiever',
      description: 'Score at least 80%',
      icon: '★',
      unlocked: results.some((result) => result.percentage >= 80)
    },
    {
      title: 'Interview Pro',
      description: 'Complete 10 interviews',
      icon: '◆',
      unlocked: results.length >= 10
    }
  ];

  return (
    <div className="dashboard dashboard-home">
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <p className="eyebrow">Your preparation space</p>
          <h1>Welcome back, {firstName}!</h1>
          <p>Every focused session builds the confidence you need for your next opportunity.</p>
          <button type="button" className="hero-action-button" onClick={() => onNavigate('mock')}>
            <span aria-hidden="true">◉</span> Start Mock Interview
          </button>
        </div>

        <div className="hero-real-stats" aria-label="Your interview preparation statistics">
          <div>
            <strong>{loadingData ? '—' : stats?.totalPracticeQuestions ?? 0}</strong>
            <span>Questions</span>
          </div>
          <div>
            <strong>{loadingData ? '—' : stats?.totalInterviews ?? 0}</strong>
            <span>Interviews</span>
          </div>
          <div>
            <strong>{loadingData || !stats?.totalInterviews ? '—' : `${stats.bestScorePercentage}%`}</strong>
            <span>Best score</span>
          </div>
        </div>

        <div className="hero-orb hero-orb-one" aria-hidden="true"></div>
        <div className="hero-orb hero-orb-two" aria-hidden="true"></div>
      </section>

      {dataError && <p className="error-message dashboard-data-error">{dataError}</p>}

      <section className="dashboard-home-section" aria-labelledby="dashboard-progress-title">
        <div className="dashboard-home-heading">
          <div>
            <p className="eyebrow">At a glance</p>
            <h2 id="dashboard-progress-title">Your Progress</h2>
          </div>
          <button type="button" onClick={() => onNavigate('progress')}>View details →</button>
        </div>

        <div className="dashboard-progress-grid">
          <article className="dashboard-chart-card">
            <div className="dashboard-card-heading">
              <div>
                <h3>Recent scores</h3>
                <p>Your latest interview results, shown chronologically.</p>
              </div>
              <span className="chart-legend"><i></i> Score</span>
            </div>

            {loadingData ? (
              <div className="dashboard-chart-state">Loading your progress...</div>
            ) : recentChartResults.length === 0 ? (
              <div className="dashboard-chart-state dashboard-chart-empty">
                <span aria-hidden="true">↗</span>
                <div>
                  <strong>Your journey starts here</strong>
                  <p>Complete a mock interview to see your progress chart.</p>
                </div>
              </div>
            ) : (
              <ScoreLineChart results={recentChartResults} compact />
            )}
          </article>

          <article className="dashboard-goal-card">
            <div className="dashboard-goal-icon" aria-hidden="true">🎯</div>
            <p className="eyebrow">Your Next Goal</p>
            <h3>Reach an 80% score</h3>
            <div className="dashboard-goal-value">
              <strong>{results.length === 0 ? '—' : `${latestScore}%`}</strong>
              <span>Latest score</span>
            </div>
            <div className="dashboard-goal-track" role="progressbar" aria-label="Latest score toward 80 percent goal" aria-valuemin="0" aria-valuemax="100" aria-valuenow={latestScore}>
              <span style={{ width: `${Math.min(latestScore, 100)}%` }}></span>
              <i></i>
            </div>
            <p className="dashboard-goal-message">
              {results.length === 0
                ? 'Take your first interview to begin tracking this goal.'
                : goalReached
                  ? 'Goal reached—excellent work! Keep the momentum going. ✨'
                  : `${80 - latestScore} percentage points to go. Keep practicing!`}
            </p>
          </article>
        </div>
      </section>

      <section className="dashboard-home-section" aria-labelledby="achievements-title">
        <div className="dashboard-home-heading">
          <div>
            <p className="eyebrow">Celebrate your progress</p>
            <h2 id="achievements-title">Achievements</h2>
          </div>
          <span>{achievementList.filter((achievement) => achievement.unlocked).length} of 4 unlocked</span>
        </div>

        <div className="achievement-grid">
          {achievementList.map((achievement) => (
            <article className={`achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}`} key={achievement.title}>
              <div className="achievement-icon" aria-hidden="true">{achievement.unlocked ? achievement.icon : '○'}</div>
              <div>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
              </div>
              <span>{achievement.unlocked ? 'Unlocked' : 'Locked'}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-home-section" aria-labelledby="actions-title">
        <div className="dashboard-home-heading">
          <div>
            <p className="eyebrow">Keep learning</p>
            <h2 id="actions-title">Choose your next step</h2>
          </div>
        </div>

        <div className="dashboard-action-bento">
          <article className="home-action-card mock-action-card">
            <div className="home-action-icon" aria-hidden="true">◉</div>
            <span className="featured-label">Featured</span>
            <h3>Mock Interview</h3>
            <p>Challenge yourself with a timed interview and track your progress.</p>
            <button type="button" onClick={() => onNavigate('mock')}>
              Start interview <span aria-hidden="true">→</span>
            </button>
          </article>

          <article className="home-action-card practice-action-card">
            <div className="home-action-icon" aria-hidden="true">?</div>
            <h3>Practice Questions</h3>
            <p>Build thoughtful answers at your own pace.</p>
            <div className="practice-shortcuts">
              <button type="button" onClick={() => onPractice('Technical')}>Technical</button>
              <button type="button" onClick={() => onPractice('Behavioral')}>Behavioral</button>
              <button type="button" onClick={() => onPractice('General')}>General</button>
            </div>
          </article>

          <article className="home-action-card progress-action-card">
            <div className="home-action-icon" aria-hidden="true">↗</div>
            <h3>My Progress</h3>
            <p>Explore your score trends, goals, and interview history.</p>
            <button type="button" onClick={() => onNavigate('progress')}>
              View progress <span aria-hidden="true">→</span>
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
