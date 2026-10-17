import { el, mountPlatformBar, mount } from '@platform2e/ui';
import './home.css';

const TOOLS = [
  {
    href: 'character/',
    title: 'Character Generator',
    text: 'Roll ability scores, check class and race limits, and get THAC0, saving throws and derived modifiers. Export a character sheet to Excel.',
  },
  {
    href: 'dungeon/',
    title: 'Dungeon Generator',
    text: 'Generate dungeon maps from the classic random dungeon tables, all at once or one roll at a time. The same seed always gives the same dungeon.',
  },
  {
    href: 'tracker/',
    title: 'Initiative Tracker',
    text: 'Run initiative, combat and loot at the table. Start an online session and players can declare their actions from their own devices.',
  },
];

mountPlatformBar('home');

const page = el('div', { cls: 'home' });
page.append(
  el('h1', { text: 'AD&D 2e DM Tools' }),
  el('p', { cls: 'home__intro', text: 'Tools for running Advanced Dungeons & Dragons, 2nd Edition.' }),
);

const list = el('ul', { cls: 'home__tools' });
for (const tool of TOOLS) {
  const card = el('a', { cls: 'tool-card', attrs: { href: tool.href } });
  card.append(
    el('h2', { cls: 'tool-card__title', text: tool.title }),
    el('p', { cls: 'tool-card__text', text: tool.text }),
    el('span', { cls: 'tool-card__go', text: 'Open' }),
  );
  const item = el('li');
  item.append(card);
  list.append(item);
}
page.append(list);

mount(document.getElementById('app')!, page);
