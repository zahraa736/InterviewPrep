import { useState } from 'react';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'practice', label: 'Practice Questions', icon: '?' },
  { id: 'mock', label: 'Mock Interview', icon: '◉' },
  { id: 'progress', label: 'My Progress', icon: '↗' },
  { id: 'profile', label: 'My Profile', icon: '○' }
];

function Sidebar({ activePage, onNavigate, onLogout, user, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavigation(page) {
    onNavigate(page);
    setMenuOpen(false);
  }

  return (
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-mark" aria-hidden="true">IP</span>
          <span>InterviewPrep</span>
        </div>

        <button
          type="button"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-controls="sidebar-navigation"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '×' : '☰'}
        </button>
      </div>

      <nav id="sidebar-navigation" className="sidebar-navigation" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
            aria-current={activePage === item.id ? 'page' : undefined}
            onClick={() => handleNavigation(item.id)}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-pressed={theme === 'dark'}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'light' ? '☾' : '☀'}
          </span>
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>

        <div className="sidebar-user">
          <div className="sidebar-avatar" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>
        <button type="button" className="sidebar-logout" onClick={onLogout}>
          <span className="sidebar-icon" aria-hidden="true">↗</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
