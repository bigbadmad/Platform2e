import type { HelpTopic } from '@platform2e/ui';

/** Keys match the app phases, so main.ts can switch topic with the phase. */
export const HELP: Record<string, HelpTopic> = {
  setup: {
    title: 'Encounter setup',
    sections: [
      {
        heading: 'Getting ready',
        paragraphs: ['Add your players and the monsters, then press Start Encounter. You need at least two combatants.'],
      },
      {
        heading: 'Players and monsters',
        items: [
          'Add Player: a name, plus any standing initiative modifiers such as weapon speed, casting time, dexterity reaction, haste or slow.',
          'Add Monster/NPC: a name, Max HP and a quantity. Browse Monster Library fills in the stats for you.',
          'Loot & XP (optional): a treasure type and XP per kill feed the loot screen after the fight.',
          'Tick Surprised for anyone caught off guard. They cannot act in the surprise segments.',
        ],
      },
      {
        heading: 'Random encounters',
        paragraphs: ['Pick a terrain and press Generate for a random encounter. Reroll gives another one. Then add it to the combatants.'],
      },
      {
        heading: 'Online play',
        paragraphs: [
          'Start online session gives you a code and a link. Players open the link on their own devices, join, declare their actions and follow the segments live. Copy link copies the player link and End closes the session.',
        ],
      },
      {
        heading: 'Saving',
        paragraphs: ['Export saves the encounter as a file and Import loads one. The encounter is also kept in this browser as you go.'],
      },
    ],
  },
  initiative: {
    title: 'Initiative',
    sections: [
      {
        heading: 'Rolling',
        items: [
          'Enter each player’s d10 roll. Roll Monsters & NPCs rolls for the monsters.',
          'The total is the d10 plus modifiers. The lowest total acts first, and equal totals act at the same time. A total is never lower than 1.',
        ],
      },
      {
        heading: 'Each combatant',
        items: [
          'Speed is the weapon speed or casting time for this round, and Label is what they are doing.',
          'Range marks someone who is at range rather than in melee.',
          'HdC marks a combatant who is hors de combat and will not act this round. Mark Recovered brings them back.',
        ],
      },
      {
        heading: 'Surprise',
        paragraphs: ['If anyone is surprised, a surprise round runs first. Surprised combatants skip it.'],
      },
      {
        heading: 'Starting combat',
        paragraphs: ['Lock In & Begin Combat starts the fight once every roll is in. Back to Setup returns to the setup screen.'],
      },
      {
        heading: 'Online play',
        paragraphs: [
          'With an online session running, players declare their own actions and the server rolls their d10. When everyone has declared, auto-lock can start combat for you.',
        ],
      },
    ],
  },
  combat: {
    title: 'Combat',
    sections: [
      {
        heading: 'Segments',
        paragraphs: ['The bar shows the current segment. Combatants whose initiative total matches the segment act in it.'],
      },
      {
        heading: 'Moving on',
        items: [
          'The Next: Seg button moves to the next segment where someone acts.',
          'Space or the right arrow does the same. Space is ignored while a button or a text box has focus, and the right arrow works everywhere except text boxes.',
          'When the round is over, Next Round starts a new one.',
        ],
      },
      {
        heading: 'Hit points',
        paragraphs: [
          'Dmg and Heal change a combatant’s HP. At 0 HP a combatant is defeated. When every monster is down, the encounter moves to the loot screen.',
        ],
      },
      {
        heading: 'Other buttons',
        items: [
          'Re-enter Initiative goes back to the initiative screen without ending the encounter.',
          'End Encounter asks you to confirm, then clears the whole encounter, players included, and returns to a blank setup screen.',
        ],
      },
      {
        heading: 'Online play',
        paragraphs: ['Done and Waiting show which acting players have tapped Done for this segment. They are a hint only and never stop you pressing Next.'],
      },
    ],
  },
  loot: {
    title: 'Loot and XP',
    sections: [
      {
        heading: 'What you see',
        paragraphs: [
          'The XP and treasure for everything that was defeated: individual treasure carried by the monsters, and lair treasure by type. Items marked (C) are cursed.',
        ],
      },
      {
        heading: 'Rolling again',
        paragraphs: ['Reroll rolls that treasure again.'],
      },
      {
        heading: 'XP',
        paragraphs: ['Divide the XP equally among the surviving party members.'],
      },
      {
        heading: 'Finishing',
        items: [
          'Save Loot & XP to Session adds it to the running totals on the setup screen.',
          'Continue without Saving returns to setup without recording it.',
          'Your players stay in the roster either way.',
        ],
      },
    ],
  },
};
