import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from './api/client.js';
import App from './App.jsx';

vi.mock('./api/client.js', () => ({
  apiFetch: vi.fn()
}));

vi.mock('./pages/Dashboard.jsx', () => ({
  default: () => <h1>Dashboard test page</h1>
}));
vi.mock('./pages/Practice.jsx', () => ({
  default: () => <h1>Practice test page</h1>
}));
vi.mock('./pages/MockInterview.jsx', () => ({
  default: () => <h1>Mock Interview test page</h1>
}));
vi.mock('./pages/Progress.jsx', () => ({
  default: () => <h1>Progress test page</h1>
}));
vi.mock('./pages/Profile.jsx', () => ({
  default: () => <h1>Profile test page</h1>
}));

const authenticatedUser = {
  _id: 'user-123',
  name: 'Test Student',
  email: 'student@example.test'
};

function mockProfileLoad() {
  apiFetch.mockImplementation((path) => {
    if (path === '/api/auth/me') return Promise.resolve({ user: authenticatedUser });
    return Promise.reject(new Error(`Unexpected API request: ${path}`));
  });
}

async function renderAuthenticatedApp({ page = 'dashboard', theme = 'light' } = {}) {
  localStorage.setItem('token', 'test-jwt');
  localStorage.setItem('activePage', page);
  localStorage.setItem('theme', theme);
  mockProfileLoad();
  render(<App />);
  await screen.findByText(page === 'progress' ? 'Progress test page' : 'Dashboard test page');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false })
  });
});

describe('App-level behavior', () => {
  test('shows Login when no JWT is stored', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('opens Dashboard after a successful login', async () => {
    apiFetch.mockResolvedValueOnce({ token: 'test-jwt', user: authenticatedUser });
    render(<App />);
    await screen.findByRole('heading', { name: 'Welcome back' });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.test' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecurePass123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Dashboard test page')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('test-jwt');
  });

  test('navigates between protected pages', async () => {
    await renderAuthenticatedApp();

    fireEvent.click(screen.getByRole('button', { name: /Practice Questions/ }));
    expect(screen.getByText('Practice test page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mock Interview/ }));
    expect(screen.getByText('Mock Interview test page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /My Progress/ }));
    expect(screen.getByText('Progress test page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /My Profile/ }));
    expect(screen.getByText('Profile test page')).toBeInTheDocument();
  });

  test('restores the saved protected page after authentication is checked', async () => {
    await renderAuthenticatedApp({ page: 'progress' });

    expect(screen.getByText('Progress test page')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/me');
  });

  test('logout clears authentication and saved navigation state', async () => {
    await renderAuthenticatedApp({ page: 'progress' });
    fireEvent.click(screen.getByRole('button', { name: /Log out/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, log out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('activePage')).toBeNull();
  });

  test('returns to Login when an existing JWT expires', async () => {
    localStorage.setItem('token', 'expired-test-jwt');
    localStorage.setItem('activePage', 'practice');
    apiFetch.mockImplementation(() => {
      window.dispatchEvent(new Event('auth:expired'));
      return Promise.reject(new Error('Invalid or expired token'));
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('activePage')).toBeNull();
  });

  test('switches between light and dark mode and stores the selection', async () => {
    await renderAuthenticatedApp({ theme: 'light' });
    expect(document.documentElement.dataset.theme).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(localStorage.getItem('theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('restores a saved theme when App renders again', async () => {
    localStorage.setItem('theme', 'dark');
    render(<App />);

    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
