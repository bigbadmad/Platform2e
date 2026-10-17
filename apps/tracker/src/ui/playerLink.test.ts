import { describe, it, expect } from 'vitest';
import { playerLink } from './playerLink.ts';

describe('playerLink', () => {
  it('sits next to the DM page when the tracker is under a sub-path', () => {
    expect(playerLink('ABCD', 'https://example.com/tracker/')).toBe('https://example.com/tracker/play.html?code=ABCD');
    expect(playerLink('ABCD', 'https://example.com/tracker/index.html')).toBe(
      'https://example.com/tracker/play.html?code=ABCD',
    );
  });

  it('still works when the tracker is at the site root', () => {
    expect(playerLink('ABCD', 'https://encountertracker.netlify.app/')).toBe(
      'https://encountertracker.netlify.app/play.html?code=ABCD',
    );
  });

  it('drops any query string or fragment from the DM page', () => {
    expect(playerLink('ABCD', 'https://example.com/tracker/?debug=1#top')).toBe(
      'https://example.com/tracker/play.html?code=ABCD',
    );
  });

  it('keeps a port and escapes unusual codes', () => {
    expect(playerLink('a b', 'http://localhost:4173/tracker/')).toBe('http://localhost:4173/tracker/play.html?code=a+b');
  });
});
