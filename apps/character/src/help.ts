import type { HelpTopic } from '@platform2e/ui';

export const HELP: Record<string, HelpTopic> = {
  character: {
    title: 'Character Generator',
    sections: [
      {
        heading: 'Getting started',
        paragraphs: [
          'Choose a roll method, roll your ability scores, assign each roll to an ability, then choose race, class, level and alignment.',
        ],
      },
      {
        heading: 'Roll method',
        items: [
          '4d6, drop lowest: four six-sided dice for each score, keeping the best three.',
          '3d6 straight: three dice for each score.',
          'DM mode: nothing is rolled. Type each ability score into the Final column yourself.',
        ],
      },
      {
        heading: 'Assigning rolls',
        paragraphs: [
          'Each rolled number has an Assign to menu. Pick the ability it should go to. Each roll can be assigned once, and each ability takes one roll.',
        ],
      },
      {
        heading: 'Race and class',
        items: [
          'Racial ability adjustments are applied when you choose a race.',
          'Classes your race cannot take, or that your ability scores do not qualify for, are greyed out.',
          'A multi-class list appears when your race and scores allow it. Humans cannot multi-class.',
        ],
      },
      {
        heading: 'Exceptional strength',
        paragraphs: [
          'A fighter with Strength 18 gets an exceptional strength percentage. It is rolled for you. In DM mode, type it in (00 means 100).',
        ],
      },
      {
        heading: 'Results',
        paragraphs: [
          'Hit Points and THAC0 appear under the Character box once the class and level are set. The cards on the right show ability modifiers, saving throws, physical details, proficiency slots and spells per day. Thieves, bards and rangers also get a skills card.',
        ],
      },
      {
        heading: 'Keeping your character',
        paragraphs: ['Export to Excel downloads a character sheet. Nothing is stored in the browser, so export before you leave the page.'],
      },
    ],
  },
};
