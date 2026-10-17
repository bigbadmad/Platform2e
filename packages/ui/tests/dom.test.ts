import { describe, it, expect, vi } from 'vitest';
import { el, btn, mount } from '../src/index.js';

describe('el', () => {
  it('creates an element with classes, text and attributes', () => {
    const e = el('a', { cls: 'one two', text: 'hi', attrs: { href: '/x' } });
    expect(e.tagName).toBe('A');
    expect(e.className).toBe('one two');
    expect(e.textContent).toBe('hi');
    expect(e.getAttribute('href')).toBe('/x');
  });

  it('accepts class lists and ignores extra spaces', () => {
    expect(el('div', { cls: ['a  b', '', 'c'] }).className).toBe('a b c');
  });

  it('sets text as text, not markup', () => {
    const e = el('p', { text: '<b>x</b>' });
    expect(e.querySelector('b')).toBeNull();
    expect(e.textContent).toBe('<b>x</b>');
  });
});

describe('btn and mount', () => {
  it('calls the handler when clicked', () => {
    const fn = vi.fn();
    btn('Go', 'primary', fn).click();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('mount replaces whatever the container held', () => {
    const box = el('div', { html: '<span>old</span><span>older</span>' });
    const child = el('em', { text: 'new' });
    mount(box, child);
    expect(box.children).toHaveLength(1);
    expect(box.firstElementChild).toBe(child);
  });
});
