import { describe, it, expect } from 'vitest';
import type { AppState } from './types.ts';
import { HELP } from './help.ts';

// Compile-time guard: adding a phase to AppState fails here until it is listed.
const phases: Record<AppState['phase'], true> = { setup: true, initiative: true, combat: true, loot: true };

describe('tracker help', () => {
  it('has a topic for every phase, because the help follows the phase', () => {
    for (const phase of Object.keys(phases)) expect(HELP[phase], phase).toBeDefined();
  });

  it('gives every topic a title and some text', () => {
    for (const [key, topic] of Object.entries(HELP)) {
      expect(topic.title.trim(), key).not.toBe('');
      expect(topic.sections.length, key).toBeGreaterThan(0);
      for (const section of topic.sections) {
        const text = [...(section.paragraphs ?? []), ...(section.items ?? [])];
        expect(text.length, `${key}: ${section.heading}`).toBeGreaterThan(0);
        for (const line of text) expect(line.trim(), key).not.toBe('');
      }
    }
  });
});
