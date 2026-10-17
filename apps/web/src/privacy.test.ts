import { describe, it, expect } from 'vitest';
import { privacyNote } from './privacy.js';

describe('privacyNote', () => {
  it('says nothing is counted when analytics is not configured', () => {
    const note = privacyNote(null);
    expect(note).toContain('does not count visits');
    expect(note).not.toMatch(/Umami|Plausible/);
    expect(note).not.toMatch(/Do Not Track/);
  });

  it('names Umami and mentions session codes, which Umami is told to leave out', () => {
    const note = privacyNote('umami');
    expect(note).toContain('counted with Umami');
    expect(note).toContain('session codes');
    expect(note).not.toContain('Plausible');
  });

  it('names Plausible without promising anything about session codes', () => {
    const note = privacyNote('plausible');
    expect(note).toContain('counted with Plausible');
    expect(note).not.toContain('session codes');
    expect(note).not.toContain('Umami');
  });

  it('always covers where saved work lives and the online session exception', () => {
    for (const provider of [null, 'umami', 'plausible'] as const) {
      const note = privacyNote(provider);
      expect(note).toContain('stay in your browser');
      expect(note).toContain('Online tracker sessions');
    }
  });
});
