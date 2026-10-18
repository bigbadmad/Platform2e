// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { buildDeclareForm, type DeclareFormHooks, type FormValues } from './declareForm.ts';
import { parseWhole, sameExtras, shouldAdoptExtras, standingExtras } from './declare.ts';
import { toPublicView } from '../sync/publicView.ts';
import type { AppState, Combatant } from '../types.ts';

const base = (): FormValues => ({
  input: { kind: 'weapon_speed', label: 'Long sword', value: 5 },
  extras: { adjustments: [{ kind: 'dex_reaction', label: 'Dex 17', value: -2 }], hasted: false, slowed: false },
});

function setup(over: Partial<DeclareFormHooks> = {}) {
  let standing = base();
  const submit = vi.fn(async (): Promise<string | null> => null);
  const remember = vi.fn();
  const form = buildDeclareForm({
    start: base(),
    current: () => standing,
    remember,
    submit,
    ...over,
  });
  document.body.replaceChildren(form.root);
  return { form, submit, remember, setStanding: (v: FormValues) => { standing = v; } };
}

const rows = () => Array.from(document.querySelectorAll('.player-mod-row'));
const bonus = () => document.querySelector('.player-bonus')!.textContent!;
const box = (text: string) =>
  Array.from(document.querySelectorAll<HTMLLabelElement>('.speed-toggle'))
    .find((l) => l.textContent!.includes(text))!
    .querySelector('input')!;
const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const addBtn = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Add a modifier')!;
const rollBtn = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent!.startsWith('Roll') || b.textContent === 'Rolling...')!;

describe('declare form modifiers', () => {
  it('opens with the modifiers the DM entered, and shows what they add to the d10', () => {
    setup();
    expect(rows()).toHaveLength(1);
    expect((rows()[0].querySelector('input[type=text]') as HTMLInputElement).value).toBe('Dex 17');
    expect(bonus()).toBe('Added to your d10: d10 +3 (+5 Long sword, -2 Dex 17)');
  });

  it('adds a modifier and includes it in the line and the submission', async () => {
    const { submit } = setup();
    click(addBtn());
    const row = rows()[1];
    const [label, value] = Array.from(row.querySelectorAll('input')) as HTMLInputElement[];
    type(label, 'Ring of speed');
    type(value, '-1');
    (row.querySelector('select') as HTMLSelectElement).value = 'other';
    row.querySelector('select')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(bonus()).toContain('-1 Ring of speed');
    click(rollBtn());
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith({
      input: { kind: 'weapon_speed', label: 'Long sword', value: 5 },
      extras: {
        adjustments: [
          { kind: 'dex_reaction', label: 'Dex 17', value: -2 },
          { kind: 'other', label: 'Ring of speed', value: -1 },
        ],
        hasted: false,
        slowed: false,
      },
    });
  });

  it('removes a modifier', () => {
    setup();
    click(rows()[0].querySelector('button')!);
    expect(rows()).toHaveLength(0);
    expect(bonus()).toBe('Added to your d10: d10 +5 (+5 Long sword)');
  });

  it('stops adding at six', () => {
    setup();
    for (let i = 0; i < 8; i++) click(addBtn());
    expect(rows()).toHaveLength(6);
    expect(addBtn().disabled).toBe(true);
  });

  it('haste takes 2 off and is sent with the declaration', async () => {
    const { submit } = setup();
    box('Hasted').checked = true;
    box('Hasted').dispatchEvent(new Event('change', { bubbles: true }));
    expect(bonus()).toContain('d10 +1');
    expect(bonus()).toContain('-2 Haste');
    click(rollBtn());
    await Promise.resolve();
    expect((submit.mock.calls[0] as unknown as [FormValues])[0].extras.hasted).toBe(true);
  });

  it('slow shows the Dex bonus as negated and out of the sum', () => {
    setup();
    box('Slowed').checked = true;
    box('Slowed').dispatchEvent(new Event('change', { bubbles: true }));
    expect(bonus()).toBe('Added to your d10: d10 +5 (+5 Long sword, Dex 17 -2 negated)');
  });

  it('shows the server error and lets the player try again', async () => {
    setup({ submit: vi.fn(async () => 'Nope') });
    click(rollBtn());
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('.player-error')!.textContent).toBe('Nope');
    expect(rollBtn().disabled).toBe(false);
  });

  it('rejects a fractional or malformed modifier instead of rounding it', () => {
    const { submit } = setup();
    const value = rows()[0].querySelectorAll('input')[1] as HTMLInputElement;
    for (const bad of ['1.5', '2x', '1e1', '', '31', '-31']) {
      type(value, bad);
      click(rollBtn());
      expect(submit, bad).not.toHaveBeenCalled();
      expect(document.querySelector('.player-error')!.textContent, bad).toContain('whole numbers');
      expect(value.getAttribute('aria-invalid'), bad).toBe('true');
      expect(bonus(), bad).toContain('Fix it');
    }
    type(value, '-3');
    expect(value.hasAttribute('aria-invalid')).toBe(false);
    expect(bonus()).toContain('-3 Dex 17');
  });

  it('keeps what was typed in a bad row when another row is removed', () => {
    setup();
    click(addBtn());
    const first = rows()[0].querySelectorAll('input')[1] as HTMLInputElement;
    type(first, '1.5');
    click(rows()[1].querySelector('button')!);
    const again = rows()[0].querySelectorAll('input')[1] as HTMLInputElement;
    expect(again.value).toBe('1.5');
    expect(again.getAttribute('aria-invalid')).toBe('true');
  });

  it('refuses a fractional speed too', () => {
    const { submit } = setup();
    type(document.getElementById('decl-value') as HTMLInputElement, '5.5');
    click(rollBtn());
    expect(submit).not.toHaveBeenCalled();
  });

  it('refuses a speed outside 0 to 30 without calling the server', () => {
    const { submit } = setup();
    type(document.getElementById('decl-value') as HTMLInputElement, '40');
    click(rollBtn());
    expect(submit).not.toHaveBeenCalled();
    expect(document.querySelector('.player-error')!.textContent).toContain('0 and 30');
  });
});

describe('declare form following the DM', () => {
  const changed = (): FormValues => ({
    input: { kind: 'weapon_speed', label: 'Long sword', value: 5 },
    extras: { adjustments: [{ kind: 'dex_reaction', label: 'Dex 17', value: -3 }], hasted: true, slowed: false },
  });

  it('an untouched form takes the DM\'s new modifiers and haste', () => {
    const { form, setStanding } = setup();
    setStanding(changed());
    form.sync();
    expect((rows()[0].querySelectorAll('input')[1] as HTMLInputElement).value).toBe('-3');
    expect(box('Hasted').checked).toBe(true);
  });

  it('a touched form keeps the player\'s entry', () => {
    const { form, setStanding } = setup();
    click(addBtn());
    setStanding(changed());
    form.sync();
    expect(rows()).toHaveLength(2);
    expect(box('Hasted').checked).toBe(false);
  });
});

describe('standing modifiers in the shared view', () => {
  const player = (over: Partial<Combatant>): Combatant => ({
    id: 'p1', name: 'Thorin', type: 'player', maxHp: null, currentHp: null, modifiers: [], d10Roll: null,
    totalInitiative: null, prevInitiative: null, isSurprised: false, isActive: true, isHorsDeCombat: false,
    atRange: false, targetId: null, action: '', ...over,
  });
  const state = (c: Combatant): AppState => ({
    phase: 'initiative', combatants: [c], roundNumber: 1, currentSegment: 1, inSurprisePhase: false,
    pendingLoot: null, sessionLoot: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, gems: [], jewelry: [], magicItems: [], xp: 0 },
    encounterId: 'e1',
  });

  it('what the DM set up reaches the player\'s form', () => {
    const view = toPublicView(state(player({
      slowed: true,
      modifiers: [
        { id: 'w', kind: 'weapon_speed', value: 6, label: 'Mace' },
        { id: 'd', kind: 'dex_reaction', value: -1, label: 'Dex 16' },
      ],
    })));
    const extras = standingExtras(view, 'p1');
    expect(extras).toEqual({ adjustments: [{ kind: 'dex_reaction', label: 'Dex 16', value: -1 }], hasted: false, slowed: true });
    setup({ start: { input: { kind: 'weapon_speed', label: 'Mace', value: 6 }, extras } });
    expect(box('Slowed').checked).toBe(true);
    expect(bonus()).toContain('Dex 16 -1 negated');
  });

  it('copes with a view from a DM page that predates the fields', () => {
    const view = toPublicView(state(player({})));
    for (const p of view.players) {
      delete (p as Partial<typeof p>).adjustments;
      delete (p as Partial<typeof p>).hasted;
    }
    expect(standingExtras(view, 'p1')).toEqual({ adjustments: [], hasted: false, slowed: false });
    expect(standingExtras(null, null)).toEqual({ adjustments: [], hasted: false, slowed: false });
  });

  it('compares and adopts extras correctly', () => {
    const a = base().extras;
    expect(sameExtras(a, { ...a, adjustments: [...a.adjustments] })).toBe(true);
    expect(sameExtras(a, { ...a, hasted: true })).toBe(false);
    expect(shouldAdoptExtras(a, { ...a, slowed: true }, false)).toBe(true);
    expect(shouldAdoptExtras(a, { ...a, slowed: true }, true)).toBe(false);
    expect(shouldAdoptExtras(a, a, false)).toBe(false);
  });
});

describe('parseWhole', () => {
  it('accepts whole numbers only', () => {
    expect(parseWhole('5')).toBe(5);
    expect(parseWhole(' -2 ')).toBe(-2);
    expect(parseWhole('+3')).toBe(3);
    for (const bad of ['', ' ', '1.5', '5x', '1e1', 'abc', '--1']) expect(parseWhole(bad), bad).toBeNull();
  });
});
