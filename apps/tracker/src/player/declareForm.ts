import {
  MAX_ADJUSTMENTS,
  MAX_ADJUSTMENT_VALUE,
  MAX_LABEL_LENGTH,
  describeBonus,
  type AdjustmentKind,
  type DeclaredAdjustment,
} from '../combat.ts';
import type { DeclarationExtras, DeclarationInput } from '../sync/session.ts';
import type { Modifier } from '../types.ts';
import { btn, el, labeledInput } from '../ui/components.ts';
import { speedToggles } from '../ui/speedToggles.ts';
import { shouldAdoptExtras, shouldAdoptStanding } from './declare.ts';

export interface FormValues {
  input: DeclarationInput;
  extras: DeclarationExtras;
}

export interface DeclareFormHooks {
  /** What the form opens with. */
  start: FormValues;
  /** What the form would open with right now, so an untouched form can follow the DM's changes. */
  current: () => FormValues;
  /** The action part was edited; the caller keeps it so a reload does not lose it. */
  remember: (input: DeclarationInput) => void;
  /** Lock the declaration in. Resolves to an error message to show, or null when it went through. */
  submit: (values: FormValues) => Promise<string | null>;
}

export interface DeclareForm {
  root: HTMLElement;
  /** Re-read the DM's standing values and adopt a change if the player has not touched the form. */
  sync: () => void;
}

const ACTION_ID = 'a';

/**
 * The player's declaration form: the action and its speed, their own Dexterity and other modifiers
 * (starting from what the DM entered), hasted and slowed, and a line showing what is added to the d10.
 * The roll itself is made by the server.
 */
export function buildDeclareForm(hooks: DeclareFormHooks): DeclareForm {
  const start = hooks.start;
  const form = el('div', { cls: 'player-declare' });
  form.appendChild(el('h3', { text: 'Declare your action' }));

  const kindGroup = el('div', { cls: 'form-group' });
  kindGroup.appendChild(el('label', { text: 'Type', attrs: { for: 'decl-kind' } }));
  const kindSelect = el('select', { attrs: { id: 'decl-kind', name: 'decl-kind' } });
  kindSelect.appendChild(el('option', { text: 'Weapon (speed factor)', attrs: { value: 'weapon_speed' } }));
  kindSelect.appendChild(el('option', { text: 'Spell (casting time)', attrs: { value: 'spell_casting' } }));
  kindSelect.value = start.input.kind;
  kindGroup.appendChild(kindSelect);

  const labelGroup = labeledInput({ label: 'Action', id: 'decl-label', type: 'text', value: start.input.label, placeholder: 'e.g. Long sword' });
  const labelInput = labelGroup.querySelector('input')!;
  labelInput.maxLength = MAX_LABEL_LENGTH;
  labelInput.autocomplete = 'off';

  const valueGroup = labeledInput({ label: 'Speed / casting time', id: 'decl-value', type: 'number', value: String(start.input.value), min: '0', max: '30' });
  const valueInput = valueGroup.querySelector('input')!;
  valueInput.inputMode = 'numeric';

  // -- Modifiers --------------------------------------------------------------
  // The list is held as data and drawn from it. Typing in a row updates the data without redrawing, so
  // a keystroke never costs the player their cursor; only add, remove and a DM change redraw.
  let adjustments: DeclaredAdjustment[] = start.extras.adjustments.map((a) => ({ ...a }));
  let hasted = start.extras.hasted;
  let slowed = start.extras.slowed;

  const modsGroup = el('div', { cls: 'form-group player-mods' });
  modsGroup.appendChild(el('p', { cls: 'form-label', text: 'Your modifiers' }));
  modsGroup.appendChild(
    el('p', {
      cls: 'player-mods-hint',
      text: 'Dexterity reaction adjustment and anything else that changes your initiative. A bonus is negative (acts sooner).',
    }),
  );
  const rows = el('div', { cls: 'player-mod-rows' });
  const toggleHost = el('div', { cls: 'player-speed' });
  const bonusLine = el('p', { cls: 'player-bonus', attrs: { 'aria-live': 'polite' } });
  const addBtn = btn('Add a modifier', 'btn btn-secondary btn-sm', () => {
    if (adjustments.length >= MAX_ADJUSTMENTS) return;
    adjustments.push({ kind: 'dex_reaction', label: '', value: 0 });
    touch();
    drawRows();
    refresh();
  });
  addBtn.type = 'button';

  const mods = (): Modifier[] => {
    const speed = Number.parseInt(valueInput.value, 10);
    const action: Modifier = {
      id: ACTION_ID,
      kind: kindSelect.value === 'spell_casting' ? 'spell_casting' : 'weapon_speed',
      label: labelInput.value.trim() || 'Action',
      value: Number.isInteger(speed) ? speed : 0,
    };
    return [action, ...adjustments.map((a, i) => ({ id: `adj${i}`, kind: a.kind, label: a.label.trim() || (a.kind === 'dex_reaction' ? 'Dex' : 'Other'), value: a.value }))];
  };

  const refresh = (): void => {
    bonusLine.textContent = `Added to your d10: ${describeBonus(mods(), { hasted, slowed })}`;
    addBtn.disabled = adjustments.length >= MAX_ADJUSTMENTS;
  };

  function drawRows(): void {
    rows.replaceChildren();
    adjustments.forEach((adj, i) => {
      const row = el('div', { cls: 'player-mod-row' });

      const kind = el('select', { attrs: { 'aria-label': 'Modifier type' } }) as HTMLSelectElement;
      kind.appendChild(el('option', { text: 'Dex reaction', attrs: { value: 'dex_reaction' } }));
      kind.appendChild(el('option', { text: 'Other', attrs: { value: 'other' } }));
      kind.value = adj.kind;
      kind.addEventListener('change', () => {
        adj.kind = kind.value as AdjustmentKind;
        touch();
        refresh();
      });

      const label = el('input', { attrs: { type: 'text', placeholder: 'Label', 'aria-label': 'Modifier label', maxlength: String(MAX_LABEL_LENGTH), autocomplete: 'off' } }) as HTMLInputElement;
      label.value = adj.label;
      label.addEventListener('input', () => {
        adj.label = label.value;
        touch();
        refresh();
      });

      const value = el('input', { attrs: { type: 'number', 'aria-label': 'Modifier value', min: String(-MAX_ADJUSTMENT_VALUE), max: String(MAX_ADJUSTMENT_VALUE), step: '1' } }) as HTMLInputElement;
      value.inputMode = 'numeric';
      value.value = String(adj.value);
      value.addEventListener('input', () => {
        const n = Number.parseInt(value.value, 10);
        adj.value = Number.isInteger(n) ? n : 0;
        touch();
        refresh();
      });

      const remove = btn('\u00d7', 'btn btn-remove-sm', () => {
        adjustments.splice(i, 1);
        touch();
        drawRows();
        refresh();
      });
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove modifier');

      row.append(kind, label, value, remove);
      rows.appendChild(row);
    });
  }

  function drawToggles(): void {
    toggleHost.replaceChildren(
      speedToggles({ hasted, slowed }, (status) => {
        hasted = status.hasted;
        slowed = status.slowed;
        touch();
        refresh();
      }),
    );
  }

  modsGroup.append(rows, addBtn, toggleHost, bonusLine);

  const error = el('p', { cls: 'player-error', attrs: { role: 'alert' } });
  const rollBtn = btn('Roll d10 and lock in', 'btn btn-primary btn-start', () => void submit());

  const readInput = (): DeclarationInput | null => {
    const value = Number.parseInt(valueInput.value, 10);
    if (!Number.isInteger(value) || value < 0 || value > 30) return null;
    return { kind: kindSelect.value === 'spell_casting' ? 'spell_casting' : 'weapon_speed', label: labelInput.value.trim(), value };
  };
  const readExtras = (): DeclarationExtras => ({
    adjustments: adjustments.map((a) => ({ kind: a.kind, label: a.label.trim(), value: a.value })),
    hasted,
    slowed,
  });

  // Keep what has been typed so a screen refresh or reload never costs the player their entry.
  const rememberDraft = (): void => {
    const input = readInput();
    if (input) hooks.remember(input);
  };

  // Follow the DM while the form is untouched: if they correct this character's weapon, speed,
  // modifiers or haste before the player has typed anything, the form takes the new values. After
  // the first keystroke it is theirs.
  let touched = false;
  function touch(): void {
    touched = true;
  }
  let applied = start;
  for (const control of [kindSelect, labelInput, valueInput]) {
    control.addEventListener('change', rememberDraft);
    control.addEventListener('input', () => { touch(); refresh(); });
    control.addEventListener('change', () => { touch(); refresh(); });
  }

  const sync = (): void => {
    const next = hooks.current();
    const actionChanged = shouldAdoptStanding(applied.input, next.input, touched);
    const extrasChanged = shouldAdoptExtras(applied.extras, next.extras, touched);
    if (!actionChanged && !extrasChanged) return;
    applied = next;
    kindSelect.value = next.input.kind;
    labelInput.value = next.input.label;
    valueInput.value = String(next.input.value);
    adjustments = next.extras.adjustments.map((a) => ({ ...a }));
    hasted = next.extras.hasted;
    slowed = next.extras.slowed;
    drawRows();
    drawToggles();
    refresh();
  };

  async function submit(): Promise<void> {
    const input = readInput();
    if (!input) {
      error.textContent = 'Enter a speed between 0 and 30.';
      return;
    }
    const extras = readExtras();
    hooks.remember(input);
    error.textContent = '';
    rollBtn.disabled = true;
    rollBtn.textContent = 'Rolling...';
    const message = await hooks.submit({ input, extras });
    if (message !== null) {
      error.textContent = message;
      rollBtn.disabled = false;
      rollBtn.textContent = 'Roll d10 and lock in';
    }
  }

  drawRows();
  drawToggles();
  refresh();
  form.append(kindGroup, labelGroup, valueGroup, modsGroup, rollBtn, error);
  return { root: form, sync };
}
