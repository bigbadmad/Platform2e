import './style.css';
import { initAnalytics, track } from '@platform2e/analytics';
import { mountPlatformBar } from '@platform2e/ui';
import { getState, subscribe, saveToFile, loadFromJSON } from './state.js';
import { initMap, renderMap, exportPNG } from './ui/map.js';
import { initControls, renderControls, renderRollResults } from './ui/controls.js';
import { renderRoomKey } from './ui/roomkey.js';

function render(): void {
  const state = getState();
  renderMap(state);
  renderControls(state);
  renderRollResults(state);
  renderRoomKey(state);
}

function init(): void {
  initAnalytics();
  mountPlatformBar('dungeon');
  initMap();
  initControls();

  // Save / Load / Export
  document.getElementById('btn-save')!.addEventListener('click', () => {
    saveToFile();
    track('dungeon_saved');
  });

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  document.getElementById('btn-load')!.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = loadFromJSON(text);
      if (!result.ok) alert(`Failed to load dungeon file. ${result.reason}`);
      else track('dungeon_loaded');
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-export-png')!.addEventListener('click', () => {
    exportPNG();
    track('dungeon_exported_png');
  });

  subscribe(render);
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
