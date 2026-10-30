import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Generator } from '../src/generator.js';
import { calcDexMods, calcConMods } from '../src/statCalc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function setupDom() {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  document.documentElement.innerHTML = html;
}

describe('Generator – setClass mutex', () => {
  let gen: Generator;

  beforeEach(() => {
    setupDom();
    const rollBtn = document.getElementById('roll') as HTMLInputElement;
    gen = new Generator(rollBtn);
    gen.setup();
  });

  it('selecting single class deselects multiclass', () => {
    const singleSel  = document.getElementById('class')      as HTMLSelectElement;
    const multiSel   = document.getElementById('multiclass') as HTMLSelectElement;

    // Give multiclass a selectable option and select it
    multiSel.style.display = '';
    const opt = document.createElement('option');
    opt.value = 'fighter+mage';
    multiSel.appendChild(opt);
    multiSel.selectedIndex = multiSel.options.length - 1;

    // Now select a single class
    for (let i = 0; i < singleSel.options.length; i++) {
      if (!singleSel.options[i].disabled && singleSel.options[i].value) {
        singleSel.selectedIndex = i;
        break;
      }
    }
    gen.setClass(singleSel);

    expect(multiSel.selectedIndex).toBe(-1);
  });

  it('selecting multiclass deselects single class', () => {
    const singleSel  = document.getElementById('class')      as HTMLSelectElement;
    const multiSel   = document.getElementById('multiclass') as HTMLSelectElement;

    // Select a single class first
    for (let i = 0; i < singleSel.options.length; i++) {
      if (!singleSel.options[i].disabled && singleSel.options[i].value) {
        singleSel.selectedIndex = i;
        break;
      }
    }

    // Then select a multiclass option
    multiSel.style.display = '';
    const opt = document.createElement('option');
    opt.value = 'fighter+mage';
    multiSel.appendChild(opt);
    multiSel.selectedIndex = multiSel.options.length - 1;
    gen.setClass(multiSel);

    expect(singleSel.selectedIndex).toBe(0);
  });
});

describe('Generator – racial adjustments and derived modifiers', () => {
  let gen: Generator;

  const byId = (id: string) => document.getElementById(id) as HTMLInputElement;
  const text = (id: string) => document.getElementById(id)!.textContent;

  // Put a rolled value in the first box and assign it to the stat dropdown at `statIdx` (1=str, 2=dex...)
  function assign(boxId: string, selId: string, value: number, statIdx: number) {
    byId(boxId).value = String(value);
    const sel = document.getElementById(selId) as HTMLSelectElement;
    sel.selectedIndex = statIdx;
    gen.setOne(sel, boxId);
  }

  function pickRace(name: string) {
    const sel = document.getElementById('race') as HTMLSelectElement;
    sel.value = name;
    gen.setRace(sel);
  }

  function expectDexMods(score: number) {
    const m = calcDexMods(score);
    expect(text('rctAdj')).toBe(m.rctAdj.toString());
    expect(text('mislAdj')).toBe(m.mislAdj.toString());
    expect(text('defAdj')).toBe(m.defAdj.toString());
  }

  beforeEach(() => {
    setupDom();
    gen = new Generator(document.getElementById('roll') as HTMLInputElement);
    gen.setup();
  });

  it('recomputes dexterity modifiers when a race is chosen after the score is assigned', () => {
    assign('two', 'stat2', 17, 2);
    expectDexMods(17);

    pickRace('halfling');

    expect(byId('dex').value).toBe('18');
    expectDexMods(18);
  });

  it('applies the racial adjustment when the race is chosen first', () => {
    pickRace('halfling');
    assign('two', 'stat2', 17, 2);

    expect(byId('dex').value).toBe('18');
    expectDexMods(18);
  });

  it('leaves unassigned scores blank rather than showing NaN', () => {
    pickRace('halfling');
    expect(byId('dex').value).toBe('');
    expect(byId('str').value).toBe('');
  });

  it('does not stack adjustments when the race is changed', () => {
    assign('two', 'stat2', 15, 2);
    pickRace('halfling');
    pickRace('elf');
    pickRace('human');

    expect(byId('dex').value).toBe('15');
    expectDexMods(15);
  });

  it('keeps adjusted constitution modifiers after a class is chosen', () => {
    assign('three', 'stat3', 14, 3);
    pickRace('dwarf'); // +1 Con

    const classSel = document.getElementById('class') as HTMLSelectElement;
    const idx = Array.from(classSel.options).findIndex(o => o.value === 'fighter' && !o.disabled);
    classSel.selectedIndex = idx;
    gen.setClass(classSel);

    expect(byId('con').value).toBe('15');
    expect(gen.hpAdj).toBe(calcConMods(15, true).hpAdj);
  });
});
