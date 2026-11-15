import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, test, vi } from 'vitest';

describe('initial theme script', () => {
  test('applies the saved theme before the React module is loaded', () => {
    const html = readFileSync(new URL('index.html', `file://${process.cwd()}/`), 'utf8');
    const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(inlineScript).not.toBeNull();
    expect(html.indexOf(inlineScript[0])).toBeLessThan(html.indexOf('<script type="module"'));

    const documentMock = {
      documentElement: {
        dataset: {},
        style: {}
      }
    };
    const storageMock = {
      getItem: vi.fn().mockReturnValue('dark')
    };

    runInNewContext(inlineScript[1], {
      document: documentMock,
      localStorage: storageMock
    });

    expect(storageMock.getItem).toHaveBeenCalledWith('theme');
    expect(documentMock.documentElement.dataset.theme).toBe('dark');
    expect(documentMock.documentElement.style.colorScheme).toBe('dark');
  });
});
