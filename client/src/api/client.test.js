import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from './client.js';

beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  test('attaches the stored JWT as a Bearer Authorization header', async () => {
    localStorage.setItem('token', 'test-jwt');
    fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true })
    });

    await apiFetch('/api/example', {
      method: 'POST',
      headers: { 'X-Test-Header': 'present' }
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toContain('/api/example');
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-jwt',
        'X-Test-Header': 'present'
      }
    });
  });

  test('dispatches auth:expired and throws the API error after HTTP 401', async () => {
    const expiredListener = vi.fn();
    window.addEventListener('auth:expired', expiredListener);
    fetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Invalid or expired token' }))
    });

    await expect(apiFetch('/api/protected')).rejects.toThrow('Invalid or expired token');
    expect(expiredListener).toHaveBeenCalledOnce();

    window.removeEventListener('auth:expired', expiredListener);
  });

  test('uses a status fallback when valid JSON has no error message', async () => {
    fetch.mockResolvedValueOnce({
      status: 400,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ message: 'Invalid request' }))
    });

    await expect(apiFetch('/api/example')).rejects.toThrow('Request failed with status 400');
  });

  test.each([
    ['HTML', '<html><body>Server error</body></html>'],
    ['plain text', 'Internal server error']
  ])('uses a status fallback for %s error responses', async (_label, responseBody) => {
    fetch.mockResolvedValueOnce({
      status: 500,
      ok: false,
      text: vi.fn().mockResolvedValue(responseBody)
    });

    await expect(apiFetch('/api/example')).rejects.toThrow('Request failed with status 500');
  });

  test('uses a status fallback for an empty error response', async () => {
    fetch.mockResolvedValueOnce({
      status: 503,
      ok: false,
      text: vi.fn().mockResolvedValue('')
    });

    await expect(apiFetch('/api/example')).rejects.toThrow('Request failed with status 503');
  });
});
