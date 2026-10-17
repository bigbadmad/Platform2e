import type { HelpTopic } from '@platform2e/ui';

export const HELP: Record<string, HelpTopic> = {
  start: {
    title: 'Generating a dungeon',
    sections: [
      {
        heading: 'Settings',
        items: [
          'Dungeon Level (1 to 10) changes which monsters and how much treasure turn up.',
          'Target Size gives a range of rooms: small, medium or large. Each seed picks a target inside the range.',
          'Starting Direction is which way the first passage runs.',
          'Seed is optional. The same seed and settings always give the same dungeon. The seed used is shown after you generate, so you can type it back in later.',
        ],
      },
      {
        heading: 'Making the dungeon',
        items: [
          'Generate Full Dungeon builds the whole map in one go.',
          'Step by Step rolls one check at a time so you can watch the dungeon grow.',
        ],
      },
      {
        heading: 'Your work',
        paragraphs: ['The dungeon is kept in this browser as you go, including room notes and a half-finished step by step run.'],
      },
    ],
  },
  map: {
    title: 'Using the dungeon',
    sections: [
      {
        heading: 'The map',
        paragraphs: [
          'Drag to pan and scroll to zoom. Fit re-centres the map. Rooms are numbered and tinted by zone. The letters show what is inside: M monsters, T trap, $ treasure, * something special.',
        ],
      },
      {
        heading: 'Rooms and notes',
        paragraphs: [
          'Click a room on the map, or in the Room Key, to highlight it. The Room Key lists every room with its contents, and you can add notes to any room.',
        ],
      },
      {
        heading: 'The roll log',
        paragraphs: ['The log on the left shows exactly what was rolled for each decision, newest first.'],
      },
      {
        heading: 'Step by step',
        items: [
          'Generate Next rolls one more check.',
          'Finish Dungeon completes the rest.',
          'New clears the dungeon and starts again.',
        ],
      },
      {
        heading: 'Saving',
        items: [
          'Save downloads the dungeon as a file, and Load brings one back.',
          'Export PNG saves an image of the whole map with a scale bar and the seed.',
          'The dungeon is also kept in this browser, but only in this browser. Save a file to move it to another device.',
        ],
      },
    ],
  },
};
