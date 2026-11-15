import { useEffect, useState } from 'react';
import { apiFetch } from './api/client.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Practice from './pages/Practice.jsx';
import MockInterview from './pages/MockInterview.jsx';
import Progress from './pages/Progress.jsx';
import Profile from './pages/Profile.jsx';
import Sidebar from './components/Sidebar.jsx';
import LogoutModal from './components/LogoutModal.jsx';
import './App.css';

const authenticatedPages = ['dashboard', 'practice', 'mock', 'progress', 'profile'];
const activePageStorageKey = 'activePage';

function getSavedAuthenticatedPage() {
  const savedPage = localStorage.getItem(activePageStorageKey);
  return authenticatedPages.includes(savedPage) ? savedPage : 'dashboard';
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    let initialTheme;

    if (savedTheme === 'light' || savedTheme === 'dark') {
      initialTheme = savedTheme;
    } else {
      initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.dataset.theme = initialTheme;
    document.documentElement.style.colorScheme = initialTheme;
    return initialTheme;
  });
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken'));
  const [page, setPage] = useState(() => resetToken ? 'reset-password' : 'login');
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState('');
  const [practiceCategory, setPracticeCategory] = useState('Technical');
  const [practiceQuestionId, setPracticeQuestionId] = useState(null);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user && authenticatedPages.includes(page)) {
      localStorage.setItem(activePageStorageKey, page);
    }
  }, [page, user]);

  useEffect(() => {
    function clearAuthentication() {
      localStorage.removeItem('token');
      localStorage.removeItem(activePageStorageKey);
      setUser(null);
      setPage('login');
    }

    window.addEventListener('auth:expired', clearAuthentication);

    async function loadProfile() {
      if (resetToken) {
        setCheckingAuth(false);
        return;
      }

      if (!localStorage.getItem('token')) {
        localStorage.removeItem(activePageStorageKey);
        setCheckingAuth(false);
        return;
      }

      try {
        const data = await apiFetch('/api/auth/me');
        setUser(data.user);
        setPage(getSavedAuthenticatedPage());
      } catch (error) {
        setMessage(error.message);
      } finally {
        setCheckingAuth(false);
      }
    }

    loadProfile();
    return () => window.removeEventListener('auth:expired', clearAuthentication);
  }, [resetToken]);

  function handleLogout() {
    setLogoutModalOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem(activePageStorageKey);
    setUser(null);
    setPage('login');
    setMessage('You have been logged out.');
  }

  function showLogin() {
    window.history.replaceState({}, '', window.location.pathname);
    setMessage('');
    setPage('login');
  }

  if (checkingAuth) {
    return <main className="app-shell"><p>Checking authentication...</p></main>;
  }

  function renderAuthenticatedPage() {
    if (page === 'profile') {
      return <Profile user={user} onLogout={handleLogout} showLogout={false} />;
    }

    if (page === 'practice') {
      return (
        <Practice
          initialCategory={practiceCategory}
          initialQuestionId={practiceQuestionId}
        />
      );
    }

    if (page === 'mock') {
      return (
        <MockInterview
          onCompleted={() => {
            setProgressRefreshKey((currentKey) => currentKey + 1);
          }}
        />
      );
    }

    if (page === 'progress') {
      return (
        <Progress
          refreshKey={progressRefreshKey}
          onReviewQuestion={(question) => {
            setPracticeCategory(question.category);
            setPracticeQuestionId(question._id);
            setPage('practice');
          }}
        />
      );
    }

    return (
      <Dashboard
        user={user}
        refreshKey={progressRefreshKey}
        onNavigate={setPage}
        onPractice={(category) => {
          setPracticeCategory(category);
          setPracticeQuestionId(null);
          setPage('practice');
        }}
      />
    );
  }

  if (user) {
    return (
      <div className="authenticated-layout">
        <Sidebar
          activePage={page}
          onNavigate={(nextPage) => {
            if (nextPage === 'practice') setPracticeQuestionId(null);
            setPage(nextPage);
          }}
          onLogout={() => setLogoutModalOpen(true)}
          user={user}
          theme={theme}
          onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
        />
        <main className="authenticated-content">
          {message && <p className="status-message">{message}</p>}
          {renderAuthenticatedPage()}
        </main>
        <LogoutModal
          isOpen={logoutModalOpen}
          onCancel={() => setLogoutModalOpen(false)}
          onConfirm={handleLogout}
        />
      </div>
    );
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-intro">
        <div className="brand">InterviewPrep</div>
        <p className="eyebrow">Prepare with confidence</p>
        <h1>Turn every practice session into progress.</h1>
        <p>Build stronger answers, test your knowledge, and track your growth in one focused space.</p>
        <div className="auth-highlights">
          <span>✦ Guided practice</span>
          <span>◎ Timed interviews</span>
          <span>↗ Real progress</span>
        </div>
      </section>

      <section className="auth-panel">
        {message && <p className="status-message">{message}</p>}

        {page === 'register' ? (
          <Register
            onRegistered={() => {
              setPage('login');
              setMessage('Account created. You can now log in.');
            }}
            onShowLogin={() => {
              setMessage('');
              setPage('login');
            }}
          />
        ) : page === 'forgot-password' ? (
          <ForgotPassword onBackToLogin={showLogin} />
        ) : page === 'reset-password' ? (
          <ResetPassword token={resetToken} onBackToLogin={showLogin} />
        ) : (
          <Login
            onLogin={(loggedInUser) => {
              setUser(loggedInUser);
              setPage('dashboard');
              setMessage('');
            }}
            onShowRegister={() => {
              setMessage('');
              setPage('register');
            }}
            onForgotPassword={() => {
              setMessage('');
              setPage('forgot-password');
            }}
          />
        )}
      </section>
    </main>
  );
}

export default App;
