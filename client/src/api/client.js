const API_URL = import.meta.env.VITE_API_URL;

async function getErrorMessage(response) {
  const fallbackMessage = `Request failed with status ${response.status}`;

  try {
    const responseText = await response.text();
    if (!responseText.trim()) return fallbackMessage;

    const responseData = JSON.parse(responseText);
    return typeof responseData.error === 'string' && responseData.error.trim()
      ? responseData.error
      : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:expired'));
  }

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return res.status === 204 ? null : res.json();
}
