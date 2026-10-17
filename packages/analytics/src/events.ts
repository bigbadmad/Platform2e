/** A property value. Keep these to a small set of possible values (no names, codes or free text). */
export type Prop = string | number | boolean;

/** Counts are sent in buckets so the dashboard shows a few groups, not hundreds of distinct numbers. */
export type CountBucket = '0' | '1' | '2-3' | '4-6' | '7-10' | '11+';

export function countBucket(n: number): CountBucket {
  if (n <= 0) return '0';
  if (n === 1) return '1';
  if (n <= 3) return '2-3';
  if (n <= 6) return '4-6';
  if (n <= 10) return '7-10';
  return '11+';
}

/**
 * Every event the platform can send, and the properties each carries (`undefined` = none).
 * To add one, add it here first. Never put anything a person typed into a property.
 */
export interface AnalyticsEvents {
  character_rolled: { method: '4d6' | '3d6' };
  character_exported: { class: string; race: string };

  dungeon_generated: { mode: 'full' | 'step'; size: string; level: number };
  dungeon_saved: undefined;
  dungeon_loaded: undefined;
  dungeon_exported_png: undefined;

  tracker_encounter_started: { players: CountBucket; monsters: CountBucket };
  tracker_random_encounter: { terrain: string };
  tracker_session_started: undefined;
  tracker_exported: undefined;
  tracker_imported: undefined;
}

export type EventName = keyof AnalyticsEvents;

/** `[]` for events without properties, `[props]` for the rest. */
export type EventArgs<N extends EventName> = AnalyticsEvents[N] extends undefined
  ? []
  : [props: AnalyticsEvents[N]];

// Compile-time guard: every event's properties must be plain values.
type InvalidEvents = {
  [K in EventName]: AnalyticsEvents[K] extends Record<string, Prop> | undefined ? never : K;
}[EventName];
export const eventsAreValid: [InvalidEvents] extends [never] ? true : false = true;
