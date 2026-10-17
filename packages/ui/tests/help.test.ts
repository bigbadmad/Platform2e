import { describe, it, expect, beforeEach, vi } from 'vitest';

type Mod = typeof import('../src/index.js');
let mod: Mod;

const topics = {
  one: { title: 'Topic one', sections: [{ heading: 'Basics', paragraphs: ['First paragraph.'], items: ['Item A', 'Item B'] }] },
  two: { title: 'Topic two', sections: [{ paragraphs: ['Second topic text.'] }] },
};

const button = () => document.querySelector<HTMLButtonElement>('.p2e-bar__help')!;
const panel = () => document.getElementById('p2e-help')!;
const press = (key: string, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
  mod = await import('../src/index.js');
});

describe('the Help button', () => {
  it('is in the bar, starts closed, and points at its panel', () => {
    mod.mountPlatformBar('tracker');
    expect(button().closest('.p2e-bar')).not.toBeNull();
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-controls')).toBe('p2e-help');
    expect(panel().hidden).toBe(true);
  });

  it('opens and closes the panel and keeps aria-expanded in step', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    expect(panel().hidden).toBe(false);
    expect(button().getAttribute('aria-expanded')).toBe('true');
    button().click();
    expect(panel().hidden).toBe(true);
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  it('is only added once even if the bar is mounted twice', () => {
    mod.mountPlatformBar('tracker');
    mod.mountPlatformBar('tracker');
    expect(document.querySelectorAll('.p2e-bar__help')).toHaveLength(1);
    expect(document.querySelectorAll('#p2e-help')).toHaveLength(1);
  });
});

describe('the panel', () => {
  it('shows the current topic as a titled dialog with its text and list', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(document.getElementById('p2e-help-title')!.textContent).toBe('Topic one');
    expect(panel().textContent).toContain('First paragraph.');
    expect([...panel().querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Item A', 'Item B']);
  });

  it('works when help is registered after the bar is mounted', () => {
    mod.mountPlatformBar('tracker');
    mod.registerHelp({ topics, initial: 'two' });
    button().click();
    expect(panel().textContent).toContain('Second topic text.');
  });

  it('switches topic while closed, and while open without closing', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    mod.setHelpTopic('two');
    button().click();
    expect(document.getElementById('p2e-help-title')!.textContent).toBe('Topic two');
    mod.setHelpTopic('one');
    expect(panel().hidden).toBe(false);
    expect(document.getElementById('p2e-help-title')!.textContent).toBe('Topic one');
  });

  it('ignores an unknown topic', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    mod.setHelpTopic('nope');
    button().click();
    expect(document.getElementById('p2e-help-title')!.textContent).toBe('Topic one');
  });

  it('says so when a page has registered no help', () => {
    mod.mountPlatformBar('tracker');
    button().click();
    expect(panel().textContent).toContain('no help for this page yet');
  });

  it('treats help text as text, not markup', () => {
    mod.registerHelp({
      topics: { one: { title: '<b>x</b>', sections: [{ paragraphs: ['<img src=x onerror=alert(1)>'] }] } },
      initial: 'one',
    });
    mod.mountPlatformBar('tracker');
    button().click();
    expect(panel().querySelector('img')).toBeNull();
    expect(panel().querySelector('b')).toBeNull();
  });

  it('closes with its own close button', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    panel().querySelector<HTMLButtonElement>('.p2e-help__close')!.click();
    expect(panel().hidden).toBe(true);
  });
});

describe('keyboard', () => {
  it('? toggles the panel', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    press('?');
    expect(panel().hidden).toBe(false);
    press('?');
    expect(panel().hidden).toBe(true);
  });

  it('? is left alone while typing in a field', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    const input = document.createElement('input');
    document.body.append(input);
    press('?', input);
    expect(panel().hidden).toBe(true);
  });

  it('Escape closes the panel and returns focus to the button', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    expect(document.activeElement).toBe(panel());
    press('Escape');
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(button());
  });

  it('Escape does nothing when the panel is already closed', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    expect(() => press('Escape')).not.toThrow();
    expect(panel().hidden).toBe(true);
  });
});

describe('keys pressed inside the panel', () => {
  const heard = () => {
    const spy = vi.fn();
    document.addEventListener('keydown', spy);
    return spy;
  };

  it('never reach the tool underneath', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    const spy = heard();
    for (const key of [' ', 'ArrowRight', 'ArrowLeft', 'a', 'Enter']) press(key, panel());
    expect(spy).not.toHaveBeenCalled();
  });

  it('still reach the page from anywhere else', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    const spy = heard();
    press(' ', document.body);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('do not stop the browser acting on them', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    panel().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('Escape inside the panel closes it, once, and ? inside it still toggles', () => {
    mod.registerHelp({ topics, initial: 'one' });
    mod.mountPlatformBar('tracker');
    button().click();
    press('Escape', panel());
    expect(panel().hidden).toBe(true);
    button().click();
    press('?', panel());
    expect(panel().hidden).toBe(true);
  });
});

describe('onOpen', () => {
  it('reports the topic each time the panel opens, not when the topic changes', () => {
    const onOpen = vi.fn();
    mod.registerHelp({ topics, initial: 'one', onOpen });
    mod.mountPlatformBar('tracker');
    mod.setHelpTopic('two');
    expect(onOpen).not.toHaveBeenCalled();
    button().click();
    expect(onOpen).toHaveBeenLastCalledWith('two');
    mod.setHelpTopic('one');
    expect(onOpen).toHaveBeenCalledTimes(1);
    button().click();
    button().click();
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenLastCalledWith('one');
  });
});
