// Clicking the toolbar icon opens the side panel. Everything else lives in the panel page.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
