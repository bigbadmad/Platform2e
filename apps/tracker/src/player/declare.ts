import type { PublicView } from '../sync/publicView.ts';
import type { DeclarationExtras, DeclarationInput, MyDeclaration } from '../sync/session.ts';

/** What the declaration area of the player screen should show. */
export type DeclareStatus =
  | { kind: 'none' }
  | { kind: 'form' }
  | { kind: 'blocked'; reason: string }
  /** The DM entered this character's roll themselves (physical dice), so there is nothing to declare. */
  | { kind: 'dm-entered' }
  | { kind: 'declared'; declaration: MyDeclaration };

/**
 * A whole number typed into a field, or null for anything else. `parseInt` would turn "1.5" into 1
 * and "5x" into 5, quietly sending a different number from the one on screen.
 */
export function parseWhole(text: string): number | null {
  const t = text.trim();
  return /^[+-]?\d+$/.test(t) ? Number.parseInt(t, 10) : null;
}

/**
 * What the declare form starts with. The DM's standing action for the character wins, because after a
 * declaration is applied it IS the player's last choice, and it also reflects anything the DM has
 * changed since. The remembered draft only fills in when the DM has set nothing up.
 */
export function declareDefaults(standing: DeclarationInput | null, draft: DeclarationInput): DeclarationInput {
  if (!standing) return draft;
  return {
    kind: standing.kind,
    label: standing.label.slice(0, 40),
    value: Math.min(30, Math.max(0, Math.trunc(standing.value))),
  };
}

/**
 * Whether a changed standing action should overwrite a declare form that is already open. Only an
 * untouched form follows the DM: once the player has typed anything, their entry is theirs.
 */
export function shouldAdoptStanding(
  applied: DeclarationInput,
  next: DeclarationInput,
  touched: boolean,
): boolean {
  if (touched) return false;
  return applied.kind !== next.kind || applied.label !== next.label || applied.value !== next.value;
}

/**
 * The DM's standing Dexterity and other adjustments and haste/slow for a character, as the shared view
 * carries them. The form starts from these, so what the DM entered at setup is already on the player's
 * screen and the player adds to it.
 */
export function standingExtras(view: PublicView | null, characterId: string | null): DeclarationExtras {
  const me = view?.players.find((p) => p.id === characterId);
  return {
    adjustments: me?.adjustments ?? [],
    hasted: !!me?.hasted,
    slowed: !!me?.slowed,
  };
}

export function sameExtras(a: DeclarationExtras, b: DeclarationExtras): boolean {
  return (
    a.hasted === b.hasted &&
    a.slowed === b.slowed &&
    a.adjustments.length === b.adjustments.length &&
    a.adjustments.every((x, i) => x.kind === b.adjustments[i].kind && x.label === b.adjustments[i].label && x.value === b.adjustments[i].value)
  );
}

/** As `shouldAdoptStanding`, for the adjustments and speed status: an untouched form follows the DM. */
export function shouldAdoptExtras(applied: DeclarationExtras, next: DeclarationExtras, touched: boolean): boolean {
  return !touched && !sameExtras(applied, next);
}

export function declarationIsCurrent(view: PublicView, declaration: MyDeclaration | null): declaration is MyDeclaration {
  return declaration !== null && declaration.encounterId === view.encounterId && declaration.round === view.roundNumber;
}

export function declareStatus(
  view: PublicView | null,
  characterId: string | null,
  declaration: MyDeclaration | null,
): DeclareStatus {
  if (!view || !characterId) return { kind: 'none' };
  const me = view.players.find((p) => p.id === characterId);
  if (!me) return { kind: 'none' };

  if (view.phase === 'combat') {
    return declarationIsCurrent(view, declaration) ? { kind: 'declared', declaration } : { kind: 'none' };
  }
  if (view.phase !== 'initiative' || view.encounterId === null) return { kind: 'none' };

  if (declarationIsCurrent(view, declaration)) return { kind: 'declared', declaration };
  if (me.hasDeclared) return { kind: 'dm-entered' };
  if (!me.isActive) return { kind: 'blocked', reason: 'Your character is down and cannot act.' };
  if (me.isHorsDeCombat) return { kind: 'blocked', reason: 'Your character is hors de combat and sits this round out.' };
  if (view.inSurprisePhase && me.isSurprised) {
    return { kind: 'blocked', reason: 'You are surprised and cannot act in the surprise phase.' };
  }
  return { kind: 'form' };
}

/**
 * A key that changes only when the declaration area needs different content. The player screen
 * re-renders on every DM update, but must never rebuild a form the player is typing into.
 */
export function declareStatusKey(status: DeclareStatus): string {
  switch (status.kind) {
    case 'blocked':
      return `blocked:${status.reason}`;
    case 'declared':
      return `declared:${status.declaration.round}:${status.declaration.d10}:${status.declaration.total ?? ''}`;
    default:
      return status.kind;
  }
}

/** Turn a server error into something a player can act on. */
export function declareErrorMessage(message: string): string {
  if (message.includes('already declared')) return 'You have already declared this round.';
  if (message.includes('declarations are not open')) return 'The DM has not opened declarations yet.';
  if (message.includes('cannot act this round')) return 'Your character cannot act this round.';
  if (message.includes('no character selected')) return 'Pick your character first.';
  if (message.includes('session closed')) return 'The session has ended.';
  if (message.includes('invalid adjustments')) return 'One of your modifiers is not valid. Use whole numbers from -30 to 30.';
  if (message.includes('submit_declaration') && (message.includes('schema cache') || message.includes('Could not find'))) {
    return 'The online play server has not been updated for this version yet. Let your DM know.';
  }
  return 'Could not submit your action. Check your connection and try again.';
}
