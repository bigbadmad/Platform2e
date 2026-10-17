import type { HelpTopic } from '@platform2e/ui';

export const HELP: Record<string, HelpTopic> = {
  home: {
    title: 'AD&D 2e DM Tools',
    sections: [
      {
        heading: 'The tools',
        items: [
          'Character Generator: roll a character and export a sheet to Excel.',
          'Dungeon Generator: make a dungeon map you can save, load and export as an image.',
          'Initiative Tracker: run initiative, combat and loot at the table.',
        ],
      },
      {
        heading: 'Getting around',
        paragraphs: [
          'Pick a tool from the cards or from the bar at the top. The Help button always shows help for the page you are on. In the tracker it changes again as the encounter moves from setup to initiative, combat and loot.',
          'Press ? to open or close help from the keyboard.',
        ],
      },
      {
        heading: 'Your work',
        paragraphs: [
          'The dungeon generator and the tracker keep your work in this browser as you go. Use their Save and Export buttons to keep a copy or to move it to another device. The character generator keeps nothing, so export a sheet before you leave.',
        ],
      },
    ],
  },
};
