import { speedEffect, type SpeedStatus } from '../combat.ts';
import { el } from './components.ts';

/**
 * Hasted and Slowed checkboxes. Haste and slow cancel each other, so both can be ticked (a creature
 * hasted and then slowed is neither); the note under them says so rather than blocking the second.
 * The caller decides what a change does.
 */
export function speedToggles(
  initial: SpeedStatus,
  onChange: (status: { hasted: boolean; slowed: boolean }) => void,
): HTMLElement {
  const wrap = el('div', { cls: 'speed-toggles' });
  const state = { hasted: !!initial.hasted, slowed: !!initial.slowed };

  const note = el('span', { cls: 'speed-note' });
  const refreshNote = (): void => {
    note.textContent = state.hasted && state.slowed ? 'Haste and slow cancel out' : '';
  };

  const make = (key: 'hasted' | 'slowed', text: string, title: string): HTMLElement => {
    const label = el('label', { cls: 'speed-toggle', attrs: { title } });
    const box = el('input', { attrs: { type: 'checkbox' } }) as HTMLInputElement;
    box.checked = state[key];
    box.addEventListener('change', () => {
      state[key] = box.checked;
      refreshNote();
      onChange({ ...state });
    });
    label.append(box, document.createTextNode(` ${text}`));
    return label;
  };

  wrap.append(
    make('hasted', 'Hasted', 'Haste: -2 initiative, double movement and attack rates'),
    make('slowed', 'Slowed', 'Slow: Dexterity bonuses negated, +4 AC, -4 to hit, half movement and attacks'),
    note,
  );
  refreshNote();
  return wrap;
}

/** Short chip text for a status, or null when neither effect is in force. */
export function speedChipText(status: SpeedStatus): string | null {
  const effect = speedEffect(status);
  if (effect === 'hasted') return 'Hasted -2';
  if (effect === 'slowed') return 'Slowed: no Dex bonus, +4 AC, -4 hit';
  return null;
}
