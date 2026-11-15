import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import Profile from './Profile.jsx';

const authenticatedUser = {
  name: 'Current Student',
  email: 'current.student@example.test'
};

describe('My Profile', () => {
  test('displays the authenticated user name and email', () => {
    render(<Profile user={authenticatedUser} onLogout={vi.fn()} />);

    expect(screen.getByRole('heading', { name: authenticatedUser.name })).toBeInTheDocument();
    expect(screen.getAllByText(authenticatedUser.name)).toHaveLength(2);
    expect(screen.getAllByText(authenticatedUser.email)).toHaveLength(2);
  });

  test('does not display another user\'s profile data', () => {
    render(<Profile user={authenticatedUser} onLogout={vi.fn()} />);

    expect(screen.queryByText('Other Student')).not.toBeInTheDocument();
    expect(screen.queryByText('other.student@example.test')).not.toBeInTheDocument();
  });
});
