export type MonsterTag =
  | 'humanoid'
  | 'undead'
  | 'beast'
  | 'giant'
  | 'dragon'
  | 'monster'
  | 'elemental'
  | 'fiend'
  | 'construct';

export interface MonsterTemplate {
  name: string;
  hd: string;       // hit dice expression (display only)
  hp: number;       // typical HP
  ac: number;
  thac0: number;
  attacks: string;  // e.g. "1", "3", "2/2/1"
  damage: string;   // e.g. "1d8" or "1d4/1d4/2d6"
  mv: string;       // movement (display only)
  tags: MonsterTag[];
  notes?: string;   // brief special abilities
  /** Weapon / attack speed factor for initiative. Undefined = natural attacks with no standard modifier. */
  speed?: number;
  /** Individual treasure type carried on the body, e.g. "Q", "Q×3", "P,Q×2". "none" = nothing. */
  individual?: string;
  /** Lair treasure type letter (DMG Table 5), e.g. "D", "H". "none" = no lair treasure. */
  lairType?: string;
}
