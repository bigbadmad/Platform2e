import type { Combatant, ModifierKind } from '../types.ts';
import { getState, lockInitiative, setSpeedStatus, setState, updateCombatant, updateCombatantSilent } from '../state.ts';
import { calcInitiative, canActThisRound, describeInitiative, rollD10 } from '../combat.ts';
import { el, fmtSign, uid, iconBtn } from './components.ts';
import { speedToggles } from './speedToggles.ts';

// -- Render initiative entry screen --------------------------------------------

export function renderInitiative(): HTMLElement {
  const state = getState();
  const activeCombatants = state.combatants.filter((c) => c.isActive);

  const root = el('div', { cls: 'screen initiative-screen' });

  // Header
  const header = el('header', { cls: 'screen-header' });
  const phaseTitle = state.inSurprisePhase ? 'Surprise Phase' : `Round ${state.roundNumber}`;
  header.appendChild(el('h1', { text: 'Initiative Entry' }));
  header.appendChild(el('p', { cls: 'subtitle', text: phaseTitle }));
  root.appendChild(header);

  if (state.inSurprisePhase) {
    root.appendChild(
      el('div', {
        cls: 'notice notice-warning',
        text: 'Surprise round active: surprised combatants cannot act.'
      }),
    );
  }

  // Who the round is still waiting on - most useful with remote players, but a checklist offline too.
  const rollers = state.combatants.filter((c) => c.type === 'player' && canActThisRound(c, state.inSurprisePhase));
  if (rollers.length > 0) {
    const waiting = rollers.filter((c) => c.d10Roll === null);
    const ready = waiting.length === 0;
    root.appendChild(
      el('div', {
        cls: ['declaration-status', ready ? 'is-ready' : ''],
        text: ready
          ? `All ${rollers.length} players are in.`
          : `${rollers.length - waiting.length} of ${rollers.length} players are in. Waiting on: ${waiting.map((c) => c.name).join(', ')}`,
      }),
    );
  }

  const grid = el('div', { cls: 'initiative-grid' });
  root.appendChild(grid);

  // Render a card per active combatant
  activeCombatants.forEach((c) => {
    grid.appendChild(buildInitiativeCard(c, state.inSurprisePhase));
  });

  // -- Bottom action bar -------------------------------------------------------
  const bar = el('div', { cls: 'action-bar' });
  root.appendChild(bar);

  // Roll for all monsters/NPCs
  const rollMonstersBtn = iconBtn('fa-solid fa-dice', 'Roll Monsters & NPCs', 'btn btn-secondary', () => {
    getState()
      .combatants.filter((c) => c.isActive && c.type !== 'player')
      .forEach((c) => {
        const roll = rollD10();
        const total = calcInitiative(roll, c.modifiers, c);
        updateCombatant(c.id, { d10Roll: roll, totalInitiative: total });
        // Update the card's displayed roll value
        const rollInput = document.getElementById(`roll-${c.id}`) as HTMLInputElement | null;
        const totalEl = document.getElementById(`total-${c.id}`);
        if (rollInput) rollInput.value = String(roll);
        if (totalEl) totalEl.textContent = String(total);
      });
  });
  bar.appendChild(rollMonstersBtn);

  // Lock in and sort
  const lockBtn = iconBtn('fa-solid fa-swords', 'Lock In & Begin Combat', 'btn btn-primary', () => {
    const result = lockInitiative();
    if (!result.ok && result.reason === 'missing') alert(`Missing d10 roll for: ${result.missing.join(', ')}`);
  });
  bar.appendChild(lockBtn);

  // Back to setup
  bar.appendChild(
    iconBtn('fa-solid fa-arrow-left', 'Back to Setup', 'btn btn-ghost', () => {
      setState({ phase: 'setup' });
    }),
  );

  return root;
}

// -- Individual combatant card -------------------------------------------------

function buildInitiativeCard(c: Combatant, inSurprisePhase: boolean): HTMLElement {
  const isSurprised = c.isSurprised && inSurprisePhase;
  const card = el('div', {
    cls: ['initiative-card', `type-${c.type}`,
      isSurprised ? 'is-surprised' : '',
      c.isHorsDeCombat ? 'is-hdc' : '',
    ].filter(Boolean).join(' '),
  });

  // Name + badges
  const nameRow = el('div', { cls: 'card-name-row' });
  nameRow.appendChild(el('span', { cls: 'card-name', text: c.name }));
  nameRow.appendChild(el('span', { cls: `badge badge-${c.type}`, text: c.type }));
  if (isSurprised) nameRow.appendChild(el('span', { cls: 'badge badge-surprised', text: 'SURPRISED' }));
  if (c.isHorsDeCombat) nameRow.appendChild(el('span', { cls: 'badge badge-hdc', text: 'HdC' }));
  if (c.atRange) nameRow.appendChild(el('span', { cls: 'badge badge-range', text: 'Range' }));
  if (c.prevInitiative !== null && c.prevInitiative < 99) {
    nameRow.appendChild(el('span', { cls: 'prev-init-badge prev-init-badge--card', text: `last: ${c.prevInitiative}` }));
  }
  card.appendChild(nameRow);

  if (isSurprised) {
    card.appendChild(
      el('p', { cls: 'surprised-note', text: 'Cannot act during surprise segments.' }),
    );
    return card;
  }

  if (c.isHorsDeCombat) {
    card.appendChild(el('p', { cls: 'hdc-note', text: 'Hors de combat — will not act this round.' }));
    card.appendChild(
      iconBtn('fa-solid fa-rotate-left', 'Mark Recovered', 'btn btn-secondary btn-sm', () => {
        updateCombatant(c.id, { isHorsDeCombat: false });
      }),
    );
    return card;
  }

  // -- Action declaration for this round -------------------------------------
  // Same 3-part control as setup: type dropdown · label · speed value.
  // Pre-filled from the primary weapon/spell modifier; editable each round.
  const primaryMod = c.modifiers.find(
    (m) => m.kind === 'weapon_speed' || m.kind === 'spell_casting',
  );

  const actionFormRow = el('div', { cls: 'action-form-row' });

  // Kind dropdown - the action itself. Dex and other adjustments, haste and slow are set below.
  const actionKindSelect = el('select', { cls: 'action-kind-select' }) as HTMLSelectElement;
  const ACTION_KINDS: Array<{ kind: ModifierKind; label: string }> = [
    { kind: 'weapon_speed', label: 'Weapon Speed' },
    { kind: 'spell_casting', label: 'Spell Casting Time' },
  ];
  ACTION_KINDS.forEach(({ kind, label }) => {
    const opt = el('option', { text: label, attrs: { value: kind } });
    actionKindSelect.appendChild(opt);
  });
  if (primaryMod) actionKindSelect.value = primaryMod.kind;

  // Action label (weapon/spell name)
  const actionLabelInput = el('input', {
    attrs: {
      type: 'text',
      placeholder: 'Label (e.g. Long Sword)',
      value: primaryMod?.label ?? c.action ?? '',
    },
  }) as HTMLInputElement;

  // Speed/casting time value
  const actionValueInput = el('input', {
    attrs: {
      type: 'number',
      placeholder: 'Speed',
      min: '0',
      max: '30',
      value: primaryMod !== undefined ? String(primaryMod.value) : '0',
    },
  }) as HTMLInputElement;

  function commitAction() {
    const newKind = actionKindSelect.value as ModifierKind;
    const newLabel = actionLabelInput.value.trim();
    const newValue = parseInt(actionValueInput.value, 10);
    if (isNaN(newValue)) return;

    let newMods = c.modifiers.map((m) => ({ ...m }));
    if (primaryMod) {
      newMods = newMods.map((m) =>
        m.id === primaryMod.id
          ? { ...m, kind: newKind, label: newLabel || m.label, value: newValue }
          : m,
      );
    } else {
      newMods.push({ id: uid(), kind: newKind, label: newLabel || 'Attack', value: newValue });
    }

    const newTotal = c.d10Roll !== null ? calcInitiative(c.d10Roll, newMods, c) : null;
    updateCombatant(c.id, {
      action: newLabel,
      modifiers: newMods,
      ...(newTotal !== null ? { totalInitiative: newTotal } : {}),
    });
  }

  // Kind or value change commits immediately (single interaction, re-render OK)
  actionKindSelect.addEventListener('change', commitAction);
  actionValueInput.addEventListener('change', commitAction);
  // Label blur: silent save so tabbing to the value input doesn't lose focus
  actionLabelInput.addEventListener('change', () => {
    updateCombatantSilent(c.id, { action: actionLabelInput.value.trim() });
  });

  actionFormRow.append(actionKindSelect, actionLabelInput, actionValueInput);
  card.appendChild(actionFormRow);

  // Standing adjustments (Dex, other) are context here; they are edited in the setup panel
  const bgMods = c.modifiers.filter((m) => m.kind === 'dex_reaction' || m.kind === 'other');
  if (bgMods.length > 0) {
    const parts = bgMods.map((m) => `${m.label} ${fmtSign(m.value)}`);
    card.appendChild(el('p', { cls: 'card-other-mods', text: parts.join(' \u00b7 ') }));
  }

  card.appendChild(speedToggles(c, (status) => setSpeedStatus(c.id, status)));

  // d10 input + live total
  const rollRow = el('div', { cls: 'roll-row' });

  const rollLabel = el('label', {
    text: 'd10 roll:',
    attrs: { for: `roll-${c.id}` },
  });

  const rollInput = el('input', {
    attrs: {
      type: 'number',
      id: `roll-${c.id}`,
      min: '1',
      max: '10',
      placeholder: '1–10',
    },
  }) as HTMLInputElement;
  if (c.d10Roll !== null) rollInput.value = String(c.d10Roll);

  const totalEl = el('span', {
    cls: 'initiative-total',
    attrs: { id: `total-${c.id}` },
    text: c.totalInitiative !== null ? String(c.totalInitiative) : '-',
  });

  const breakdownEl = el('p', {
    cls: 'initiative-breakdown',
    text: c.d10Roll !== null ? describeInitiative(c.d10Roll, c.modifiers, c) : '',
  });

  rollInput.addEventListener('input', () => {
    // Update the total preview locally without touching state (avoids focus loss)
    const raw = parseInt(rollInput.value, 10);
    if (isNaN(raw) || raw < 1 || raw > 10) {
      totalEl.textContent = '\u2014';
      breakdownEl.textContent = '';
      return;
    }
    totalEl.textContent = String(calcInitiative(raw, c.modifiers, c));
    breakdownEl.textContent = describeInitiative(raw, c.modifiers, c);
  });

  rollInput.addEventListener('change', () => {
    const raw = parseInt(rollInput.value, 10);
    if (isNaN(raw) || raw < 1 || raw > 10) {
      // Silent: preview already shows '\u2014'; no re-render needed
      updateCombatantSilent(c.id, { d10Roll: null, totalInitiative: null });
      totalEl.textContent = '\u2014';
      breakdownEl.textContent = '';
      return;
    }
    const total = calcInitiative(raw, c.modifiers, c);
    totalEl.textContent = String(total);
    // Silent: preview already correct; a full re-render here would destroy the
    // Lock In button before its click event fires if the DM clicks immediately
    // after entering a roll (change fires before click in the browser event order).
    updateCombatantSilent(c.id, { d10Roll: raw, totalInitiative: total });
  });

  rollRow.append(rollLabel, rollInput, el('span', { cls: 'roll-arrow', text: '\u2192' }), totalEl);
  card.appendChild(rollRow);
  card.appendChild(breakdownEl);

  return card;
}
