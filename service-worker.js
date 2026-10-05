/**
 * VocabSaver - Background Service Worker
 * Handles context menus, extension lifecycle, and background coordination.
 */

importScripts('storage.js');

// Setup context menus
async function setupContextMenus() {
  try {
    await chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
      id: 'vocabsaver_root',
      title: 'VocabSaver: Save "%s"',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'vocabsaver_quick_dialog',
      parentId: 'vocabsaver_root',
      title: 'Choose Category / Edit Note...',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'vocabsaver_sep',
      parentId: 'vocabsaver_root',
      type: 'separator',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'vocabsaver_cat_uncategorized',
      parentId: 'vocabsaver_root',
      title: 'Save to: Uncategorized',
      contexts: ['selection']
    });

    const categories = await StorageUtil.getCategories();
    categories.slice(0, 8).forEach((cat, index) => {
      chrome.contextMenus.create({
        id: `vocabsaver_cat_${index}`,
        parentId: 'vocabsaver_root',
        title: `Save to: ${cat}`,
        contexts: ['selection']
      });
    });
  } catch (err) {
    console.error('Error creating context menus:', err);
  }
}

// Update context menus when categories change in storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.vocab_categories) {
    setupContextMenus();
  }
});

// Handle installation & setup
chrome.runtime.onInstalled.addListener(async () => {
  await StorageUtil.initDefaults();
  await setupContextMenus();
  console.log('VocabSaver extension initialized successfully.');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id || !info.selectionText) return;

  const selectedText = info.selectionText.trim();
  if (!selectedText) return;

  if (info.menuItemId === 'vocabsaver_quick_dialog') {
    // Notify top-level content script to open dialog for this selection
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'OPEN_SAVE_DIALOG',
        text: selectedText
      },
      { frameId: 0 }
    ).catch(() => {});
    return;
  }

  let category = 'Uncategorized';
  if (info.menuItemId === 'vocabsaver_cat_uncategorized') {
    category = 'Uncategorized';
  } else if (info.menuItemId.startsWith('vocabsaver_cat_')) {
    const categories = await StorageUtil.getCategories();
    const index = parseInt(info.menuItemId.replace('vocabsaver_cat_', ''), 10);
    if (!isNaN(index) && categories[index]) {
      category = categories[index];
    }
  }

  try {
    const savedItem = await StorageUtil.addWord({
      word: selectedText,
      category: category,
      context: '',
      sourceUrl: tab.url || '',
      sourceTitle: tab.title || ''
    });

    // Notify only the top frame (frameId: 0) to display a single toast
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'SHOW_TOAST',
        message: `Saved "${selectedText}" to ${category}!`,
        item: savedItem
      },
      { frameId: 0 }
    ).catch(() => {});
  } catch (err) {
    console.error('Failed to save word via context menu:', err);
  }
});
