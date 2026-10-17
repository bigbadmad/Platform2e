import { initAnalytics } from '@platform2e/analytics';
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

initAnalytics();
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

const ISSUES_URL = 'https://github.com/bigbadmad/Platform2e/issues';

function section(title: string, ...content: Array<string | HTMLElement>): HTMLElement {
  const block = el('section', { cls: 'home__note' });
  block.append(el('h2', { cls: 'home__note-title', text: title }));
  const p = el('p');
  p.append(...content);
  block.append(p);
  return block;
}

const footer = el('footer', { cls: 'home__footer' });
footer.append(
  section(
    'Beta',
    'This is a beta, so things will change and some will break. Found a bug or want something added? ',
    el('a', { text: 'Open an issue on GitHub', attrs: { href: ISSUES_URL, rel: 'noopener' } }),
    '.',
  ),
  section(
    'Privacy',
    'Visits and tool use are counted with Umami, which records which pages and tools get used. It does not record names, ' +
      'session codes or anything you type, and it respects Do Not Track and Global Privacy Control. Your characters, dungeons ' +
      'and encounters stay in your browser. Online tracker sessions are the exception: what the DM shares with players, such as ' +
      'names and initiative, goes to a server so everyone\'s devices can follow along.',
  ),
  el('p', {
    cls: 'home__fine-print',
    text:
      'Unofficial fan project. Advanced Dungeons & Dragons is a trademark of Wizards of the Coast. ' +
      'This site is not affiliated with or endorsed by them.',
  }),
);
page.append(footer);

mount(document.getElementById('app')!, page);
