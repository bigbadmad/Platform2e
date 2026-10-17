import { describe, it, expect } from 'vitest';
import { HELP } from './help.js';

describe('web help', () => {
  it('gives every topic a title and some text', () => {
    expect(Object.keys(HELP).length).toBeGreaterThan(0);
    for (const [key, topic] of Object.entries(HELP)) {
      expect(topic.title.trim(), key).not.toBe('');
      expect(topic.sections.length, key).toBeGreaterThan(0);
      for (const section of topic.sections) {
        const text = [...(section.paragraphs ?? []), ...(section.items ?? [])];
        expect(text.length, key).toBeGreaterThan(0);
        for (const line of text) expect(line.trim(), key).not.toBe('');
      }
    }
  });
});
