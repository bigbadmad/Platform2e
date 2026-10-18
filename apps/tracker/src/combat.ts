import type { AppState, Combatant, Modifier, SegmentDone } from './types.ts';
import { rollDie } from '@platform2e/dice';

// -- Initiative calculation ----------------------------------------------------

/** A haste spell gives a -2 initiative bonus. */
export const HASTE_INITIATIVE = -2;

export interface SpeedStatus {
  hasted?: boolean;
  slowed?: boolean;
}

/**
 * The speed effect actually in force. Haste and slow negate each other, so a combatant with both
 * flags set is under neither.
 */
export function speedEffect(status: SpeedStatus): 'hasted' | 'slowed' | null {
  if (status.hasted && status.slowed) return null;
  if (status.hasted) return 'hasted';
  if (status.slowed) return 'slowed';
  return null;
}

/** One line of an initiative total: what it is, what it adds, and a note when it is not applied. */
export interface InitiativePart {
  label: string;
  value: number;
  /** Set when the part is listed but does not count, e.g. a Dex bonus under slow. */
  ignored?: boolean;
}

/**
 * The parts that add up to a combatant's initiative, in display order. Slow negates Dexterity
 * combat bonuses (a negative reaction value); a Dex penalty still applies. Haste adds -2.
 */
export function initiativeParts(modifiers: Modifier[], status: SpeedStatus = {}): InitiativePart[] {
  const effect = speedEffect(status);
  const parts: InitiativePart[] = [];
  for (const mod of modifiers) {
    const ignored = effect === 'slowed' && mod.kind === 'dex_reaction' && mod.value < 0;
    parts.push({ label: mod.label, value: mod.value, ...(ignored ? { ignored: true } : {}) });
  }
  if (effect === 'hasted') parts.push({ label: 'Haste', value: HASTE_INITIATIVE });
  return parts;
}

/**
 * Compute the total initiative for a combatant given their d10 roll.
 *
 * AD&D 2e: d10 + weapon speed (or casting time) + other modifiers + Dexterity reaction adjustment.
 * A negative modifier is a bonus (acts sooner), so Dex reaction is entered as a signed delta.
 * Haste adds -2. Slow negates Dexterity bonuses. The final total is never lower than 1.
 *
 * Lower result = acts first.
 */
export function calcInitiative(d10: number, modifiers: Modifier[], status: SpeedStatus = {}): number {
  let total = d10;
  for (const part of initiativeParts(modifiers, status)) {
    if (!part.ignored) total += part.value;
  }
  // Segments start at 1, so a total of 0 or less would never come up in the segment bar.
  return Math.max(1, total);
}

/**
 * "d10 +1 (+4 Sword, -2 Dex, -2 Haste)": what is added to the d10 before it is rolled, for a form
 * that does not have the roll yet. Parts that do not count (a Dex bonus under slow) read "negated".
 */
export function describeBonus(modifiers: Modifier[], status: SpeedStatus = {}): string {
  const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
  const parts = initiativeParts(modifiers, status);
  const net = parts.reduce((sum, p) => (p.ignored ? sum : sum + p.value), 0);
  if (parts.length === 0) return 'd10';
  const detail = parts.map((p) => (p.ignored ? `${p.label} ${signed(p.value)} negated` : `${signed(p.value)} ${p.label}`));
  return `d10 ${signed(net)} (${detail.join(', ')})`;
}

/** "d10 +3 -1 -2 = 8" style text for a roll and its parts, with ignored parts left out of the sum. */
export function describeInitiative(d10: number, modifiers: Modifier[], status: SpeedStatus = {}): string {
  const bits = initiativeParts(modifiers, status).map((p) => {
    const v = p.value >= 0 ? `+${p.value}` : `${p.value}`;
    return p.ignored ? `(${v} negated)` : v;
  });
  return `${[String(d10), ...bits].join(' ')} = ${calcInitiative(d10, modifiers, status)}`;
}

/**
 * Roll a random d10 (1–10).
 */
export function rollD10(): number {
  return rollDie(10);
}

/**
 * Returns combatants sorted by totalInitiative ascending (lowest acts first).
 * Combatants without a roll yet, or inactive ones, are placed last.
 */
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    if (!a.isActive && b.isActive) return 1;
    if (a.isActive && !b.isActive) return -1;
    if (a.totalInitiative === null && b.totalInitiative === null) return 0;
    if (a.totalInitiative === null) return 1;
    if (b.totalInitiative === null) return -1;
    return a.totalInitiative - b.totalInitiative;
  });
}

/**
 * Returns active combatants whose totalInitiative matches the given segment.
 * During surprise phase, surprised combatants are excluded.
 */
export function getCombatantsAtSegment(
  combatants: Combatant[],
  segment: number,
  inSurprisePhase: boolean,
): Combatant[] {
  return combatants.filter((c) => {
    if (!c.isActive) return false;
    if (c.isHorsDeCombat) return false;
    if (inSurprisePhase && c.isSurprised) return false;
    return c.totalInitiative === segment;
  });
}

/**
 * Returns the highest initiative total among active combatants, used as the
 * dynamic ceiling for the segment bar. Minimum value returned is 10.
 */
export function maxInitiativeSegment(combatants: Combatant[]): number {
  let max = 10;
  for (const c of combatants) {
    if (c.isActive && c.totalInitiative !== null && c.totalInitiative < 99) {
      max = Math.max(max, c.totalInitiative);
    }
  }
  return max;
}

/**
 * Returns the next segment number (after currentSegment) that has at least one
 * active combatant acting. Returns null when no further activity exists within
 * maxSegment - signalling end of round.
 */
export function nextActiveSegment(
  combatants: Combatant[],
  currentSegment: number,
  maxSegment: number,
  inSurprisePhase: boolean,
): number | null {
  for (let s = currentSegment + 1; s <= maxSegment; s++) {
    if (getCombatantsAtSegment(combatants, s, inSurprisePhase).length > 0) {
      return s;
    }
  }
  return null;
}

/**
 * Returns the first segment (starting from 1) that has activity - used when
 * entering the combat phase so the tracker opens on the first live segment.
 */
export function firstActiveSegment(
  combatants: Combatant[],
  maxSegment: number,
  inSurprisePhase: boolean,
): number {
  for (let s = 1; s <= maxSegment; s++) {
    if (getCombatantsAtSegment(combatants, s, inSurprisePhase).length > 0) {
      return s;
    }
  }
  return 1;
}

/**
 * The remote Done taps for the segment on screen, or null when there are none for it. Taps recorded
 * for another encounter, round or segment are stale and are ignored.
 */
export function segmentDoneFor(
  state: Pick<AppState, 'phase' | 'encounterId' | 'roundNumber' | 'currentSegment' | 'segmentDone'>,
): SegmentDone | null {
  const s = state.segmentDone;
  if (!s || state.phase !== 'combat') return null;
  if (s.encounterId !== state.encounterId || s.round !== state.roundNumber || s.segment !== state.currentSegment) {
    return null;
  }
  return s;
}

/**
 * Whether the DM can treat the segment as handed back by the table: at least one acting player has
 * a seat, and every such player has tapped Done. Players without a seat (dice at the table) are not
 * waited on, and an unseated acting player never makes this false.
 */
export function remotePlayersAllDone(
  acting: Combatant[],
  marks: Pick<SegmentDone, 'done' | 'remote'> | null,
): { waitingOn: Combatant[]; done: Combatant[]; ready: boolean } {
  if (!marks) return { waitingOn: [], done: [], ready: false };
  const seated = acting.filter((c) => c.type === 'player' && marks.remote.includes(c.id));
  const done = seated.filter((c) => marks.done.includes(c.id));
  const waitingOn = seated.filter((c) => !marks.done.includes(c.id));
  return { waitingOn, done, ready: seated.length > 0 && waitingOn.length === 0 };
}

/**
 * Whether a combatant takes part in this round's initiative roll. Surprised combatants sit out
 * the surprise phase only; hors de combat and defeated combatants sit out entirely.
 */
export function canActThisRound(c: Combatant, inSurprisePhase: boolean): boolean {
  return c.isActive && !c.isHorsDeCombat && !(c.isSurprised && inSurprisePhase);
}

export type DeclaredKind = 'weapon_speed' | 'spell_casting';

export interface DeclaredAction {
  kind: DeclaredKind;
  label: string;
  value: number;
}

/** A Dexterity or miscellaneous adjustment a player adds to their own roll. */
export type AdjustmentKind = 'dex_reaction' | 'other';

export interface DeclaredAdjustment {
  kind: AdjustmentKind;
  label: string;
  value: number;
}

export const MAX_ADJUSTMENTS = 6;
export const MAX_ADJUSTMENT_VALUE = 30;
export const MAX_LABEL_LENGTH = 40;

/**
 * The combatant's standing weapon or spell action as the DM set it up, or null if there is none.
 *
 * `actionLabel` is the combatant's free-text action (`Combatant.action`). The DM can rename an action
 * without touching its speed, which writes only that field, and the tracker already prefers it over
 * the modifier's own label; the effective label here follows the same rule so players see what the
 * DM sees.
 */
export function primaryAction(modifiers: Modifier[], actionLabel = ''): DeclaredAction | null {
  const m = modifiers.find((x) => x.kind === 'weapon_speed' || x.kind === 'spell_casting');
  if (!m) return null;
  return { kind: m.kind as DeclaredKind, label: actionLabel.trim() || m.label, value: m.value };
}

/** The combatant's Dexterity and miscellaneous adjustments, as a player's form edits them. */
export function standingAdjustments(modifiers: Modifier[]): DeclaredAdjustment[] {
  const out: DeclaredAdjustment[] = [];
  for (const m of modifiers) {
    if (m.kind === 'dex_reaction' || m.kind === 'other') {
      out.push({ kind: m.kind, label: m.label, value: m.value });
    }
  }
  return out;
}

/**
 * Sanitise adjustments from the network or a form: known kinds only, whole numbers within range,
 * trimmed labels, at most MAX_ADJUSTMENTS. Anything else is dropped rather than repaired.
 */
export function cleanAdjustments(raw: unknown): DeclaredAdjustment[] {
  if (!Array.isArray(raw)) return [];
  const out: DeclaredAdjustment[] = [];
  for (const item of raw) {
    if (out.length >= MAX_ADJUSTMENTS) break;
    if (!item || typeof item !== 'object') continue;
    const { kind, label, value } = item as Record<string, unknown>;
    if (kind !== 'dex_reaction' && kind !== 'other') continue;
    if (typeof value !== 'number' || !Number.isInteger(value) || Math.abs(value) > MAX_ADJUSTMENT_VALUE) continue;
    const text = typeof label === 'string' ? label.trim().slice(0, MAX_LABEL_LENGTH) : '';
    out.push({ kind, label: text || (kind === 'dex_reaction' ? 'Dex' : 'Other'), value });
  }
  return out;
}

/**
 * Bring a combatant from an older save or export up to the current shape. Haste and slow used to be
 * modifiers; they are now on/off statuses, so any such modifier becomes the matching flag and is
 * removed from the list.
 *
 * Stored totals are left as they were by default, so combat already under way does not shift under
 * the DM. Pass `reroll: true` for a round still collecting rolls (the initiative phase): the roll
 * is kept and its total is recomputed, so the card agrees with the new rules rather than showing a
 * total from the old halve/+10 ones.
 */
export function migrateCombatant(c: Combatant, reroll = false): Combatant {
  const legacy = c.modifiers.filter((m) => (m.kind as string) === 'haste' || (m.kind as string) === 'slow');
  if (legacy.length === 0) return c;
  const next: Combatant = {
    ...c,
    modifiers: c.modifiers.filter((m) => !legacy.includes(m)),
    hasted: c.hasted || legacy.some((m) => (m.kind as string) === 'haste'),
    slowed: c.slowed || legacy.some((m) => (m.kind as string) === 'slow'),
  };
  if (reroll && next.d10Roll !== null && next.totalInitiative !== null && next.totalInitiative < 99) {
    next.totalInitiative = calcInitiative(next.d10Roll, next.modifiers, next);
  }
  return next;
}

/**
 * Replace the combatant's primary weapon/spell modifier with a declared action, leaving every
 * other modifier untouched. Mirrors the per-round action form on the initiative screen.
 */
export function applyDeclaredAction(
  modifiers: Modifier[],
  action: DeclaredAction,
  newId: string,
): Modifier[] {
  const primary = modifiers.find((m) => m.kind === 'weapon_speed' || m.kind === 'spell_casting');
  const label = action.label.trim();
  if (!primary) {
    return [...modifiers, { id: newId, kind: action.kind, label: label || 'Attack', value: action.value }];
  }
  return modifiers.map((m) =>
    m.id === primary.id ? { ...m, kind: action.kind, label: label || m.label, value: action.value } : m,
  );
}

/**
 * Replace all of the combatant's Dexterity and miscellaneous modifiers with a declared list. The
 * player's form starts from the DM's list and edits it, so what arrives is the whole picture.
 * `makeId` supplies an id for each new modifier; weapon and spell modifiers are left alone.
 */
export function applyDeclaredAdjustments(
  modifiers: Modifier[],
  adjustments: DeclaredAdjustment[],
  makeId: () => string,
): Modifier[] {
  const kept = modifiers.filter((m) => m.kind !== 'dex_reaction' && m.kind !== 'other');
  return [...kept, ...adjustments.map((a) => ({ id: makeId(), kind: a.kind, label: a.label, value: a.value }))];
}

/**
 * Returns a human-readable summary of a combatant's modifier stack.
 */
export function describeModifiers(modifiers: Modifier[]): string {
  if (modifiers.length === 0) return 'None';
  return modifiers.map((m) => `${m.label} (${m.value >= 0 ? `+${m.value}` : `${m.value}`})`).join(', ');
}

/**
 * Returns the net numeric modifier offset for display purposes, before haste and slow.
 */
export function netModifierOffset(modifiers: Modifier[]): number {
  return modifiers.reduce((sum, m) => sum + m.value, 0);
}
