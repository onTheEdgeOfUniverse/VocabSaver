/**
 * VocabSaver - Popup Script
 * Manages vocabulary list, category filtering, search, manual addition,
 * category management, prompt template customization, and export/import.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // State
  let allWords = [];
  let allCategories = [];
  let currentCategoryFilter = 'ALL';
  let searchQuery = '';
  let settings = {};

  // DOM Elements
  const vocabListEl = document.getElementById('vocab-list');
  const categoryFiltersEl = document.getElementById('category-filters');
  const searchInputEl = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const footerStatsEl = document.getElementById('footer-stats');

  // Modals
  const modalAddWord = document.getElementById('modal-add-word');
  const modalManageCats = document.getElementById('modal-manage-cats');
  const modalSettings = document.getElementById('modal-settings');

  // Modal Open Buttons
  const btnAddWord = document.getElementById('btn-add-word');
  const btnManageCats = document.getElementById('btn-manage-cats');
  const btnSettings = document.getElementById('btn-settings');

  // Add Word Form Elements
  const addWordInput = document.getElementById('add-word-input');
  const addCategorySelect = document.getElementById('add-category-select');
  const addNewCatGroup = document.getElementById('add-new-cat-group');
  const addNewCatInput = document.getElementById('add-new-cat-input');
  const addContextInput = document.getElementById('add-context-input');
  const btnSubmitAddWord = document.getElementById('btn-submit-add-word');

  // Manage Categories Elements
  const manageCatsList = document.getElementById('manage-cats-list');
  const newCategoryInput = document.getElementById('new-category-input');
  const btnCreateCategory = document.getElementById('btn-create-category');

  // Settings Elements
  const settingsPromptTemplate = document.getElementById('settings-prompt-template');
  const btnResetTemplate = document.getElementById('btn-reset-template');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportTrigger = document.getElementById('btn-import-trigger');
  const importFileInput = document.getElementById('import-file-input');

  // --- Initial Data Load ---
  async function loadData() {
    await StorageUtil.initDefaults();
    allWords = await StorageUtil.getWords();
    allCategories = await StorageUtil.getCategories();
    settings = await StorageUtil.getSettings();

    renderCategoriesFilter();
    renderWordsList();
  }

  // --- Render Category Filters ---
  function renderCategoriesFilter() {
    categoryFiltersEl.innerHTML = '';

    // "All" filter chip
    const allChip = document.createElement('div');
    allChip.className = `filter-chip ${currentCategoryFilter === 'ALL' ? 'active' : ''}`;
    allChip.innerHTML = `All <span class="filter-count">(${allWords.length})</span>`;
    allChip.addEventListener('click', () => {
      currentCategoryFilter = 'ALL';
      renderCategoriesFilter();
      renderWordsList();
    });
    categoryFiltersEl.appendChild(allChip);

    // Dynamic category chips
    allCategories.forEach((cat) => {
      const count = allWords.filter((w) => w.category === cat).length;
      const chip = document.createElement('div');
      chip.className = `filter-chip ${currentCategoryFilter === cat ? 'active' : ''}`;
      chip.innerHTML = `${escapeHtml(cat)} <span class="filter-count">(${count})</span>`;
      chip.addEventListener('click', () => {
        currentCategoryFilter = cat;
        renderCategoriesFilter();
        renderWordsList();
      });
      categoryFiltersEl.appendChild(chip);
    });

    // Uncategorized chip if there are any uncategorized words
    const uncategorizedCount = allWords.filter(
      (w) => !w.category || w.category === 'Uncategorized' || !allCategories.includes(w.category)
    ).length;

    if (uncategorizedCount > 0 && !allCategories.includes('Uncategorized')) {
      const uncategorizedChip = document.createElement('div');
      uncategorizedChip.className = `filter-chip ${currentCategoryFilter === 'Uncategorized' ? 'active' : ''}`;
      uncategorizedChip.innerHTML = `Uncategorized <span class="filter-count">(${uncategorizedCount})</span>`;
      uncategorizedChip.addEventListener('click', () => {
        currentCategoryFilter = 'Uncategorized';
        renderCategoriesFilter();
        renderWordsList();
      });
      categoryFiltersEl.appendChild(uncategorizedChip);
    }
  }

  // --- Render Words List ---
  function renderWordsList() {
    vocabListEl.innerHTML = '';

    // Filter words
    const filtered = allWords.filter((item) => {
      // Category match
      if (currentCategoryFilter !== 'ALL') {
        const itemCat = item.category || 'Uncategorized';
        if (currentCategoryFilter === 'Uncategorized') {
          if (itemCat !== 'Uncategorized' && allCategories.includes(itemCat)) return false;
        } else if (itemCat !== currentCategoryFilter) {
          return false;
        }
      }

      // Search match
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesWord = item.word.toLowerCase().includes(q);
        const matchesContext = item.context && item.context.toLowerCase().includes(q);
        const matchesCat = item.category && item.category.toLowerCase().includes(q);
        if (!matchesWord && !matchesContext && !matchesCat) return false;
      }

      return true;
    });

    // Update footer stats
    footerStatsEl.textContent = `${filtered.length} of ${allWords.length} words`;

    if (filtered.length === 0) {
      vocabListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <h3>${searchQuery ? 'No matching vocabulary' : 'No words saved yet'}</h3>
          <p>${
            searchQuery
              ? `No words matched "${escapeHtml(searchQuery)}"`
              : 'Highlight any word or phrase on the web and click "Save Vocab", or click the + button above.'
          }</p>
        </div>
      `;
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'word-card';

      const dateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '';

      card.innerHTML = `
        <div class="word-card-top">
          <span class="word-title">${escapeHtml(item.word)}</span>
          <span class="word-category-badge">${escapeHtml(item.category || 'Uncategorized')}</span>
        </div>
        ${
          item.context
            ? `<div class="word-context">"${escapeHtml(item.context)}"</div>`
            : ''
        }
        <div class="word-meta">
          <span class="word-date">${dateStr}</span>
          <div class="word-actions">
            <button class="card-action-btn copy" data-id="${item.id}" data-word="${escapeHtml(item.word)}" title="Copy word">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy</span>
            </button>
            <button class="card-action-btn delete" data-id="${item.id}" title="Delete word">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      // Copy Action
      const copyBtn = card.querySelector('.card-action-btn.copy');
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(item.word);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span style="color:#10b981; font-weight:600;">Copied</span>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 1500);
      });

      // Delete Action
      const deleteBtn = card.querySelector('.card-action-btn.delete');
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Delete "${item.word}" from your vocabulary?`)) {
          await StorageUtil.deleteWord(item.id);
          allWords = allWords.filter((w) => w.id !== item.id);
          renderCategoriesFilter();
          renderWordsList();
        }
      });

      vocabListEl.appendChild(card);
    });
  }

  // --- Search Filtering ---
  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    btnClearSearch.style.display = searchQuery ? 'block' : 'none';
    renderWordsList();
  });

  btnClearSearch.addEventListener('click', () => {
    searchInputEl.value = '';
    searchQuery = '';
    btnClearSearch.style.display = 'none';
    renderWordsList();
  });

  // --- Modal Management ---
  function openModal(modal) {
    modal.style.display = 'flex';
  }
  function closeModal(modal) {
    modal.style.display = 'none';
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const target = document.getElementById(modalId);
      if (target) closeModal(target);
    });
  });

  // --- Add Word Modal Handlers ---
  btnAddWord.addEventListener('click', () => {
    addWordInput.value = '';
    addContextInput.value = '';
    addNewCatInput.value = '';
    addNewCatGroup.style.display = 'none';

    // Populate categories select
    addCategorySelect.innerHTML = `
      <option value="Uncategorized">Uncategorized</option>
      ${allCategories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      <option value="__NEW__">+ Add New Category...</option>
    `;

    if (currentCategoryFilter !== 'ALL' && allCategories.includes(currentCategoryFilter)) {
      addCategorySelect.value = currentCategoryFilter;
    }

    openModal(modalAddWord);
    addWordInput.focus();
  });

  addCategorySelect.addEventListener('change', () => {
    if (addCategorySelect.value === '__NEW__') {
      addNewCatGroup.style.display = 'block';
      addNewCatInput.focus();
    } else {
      addNewCatGroup.style.display = 'none';
    }
  });

  btnSubmitAddWord.addEventListener('click', async () => {
    const word = addWordInput.value.trim();
    if (!word) {
      alert('Please enter a word or phrase');
      addWordInput.focus();
      return;
    }

    let category = addCategorySelect.value;
    if (category === '__NEW__') {
      category = addNewCatInput.value.trim() || 'Uncategorized';
    }

    const context = addContextInput.value.trim();

    try {
      await StorageUtil.addWord({
        word,
        category,
        context,
        sourceUrl: '',
        sourceTitle: 'Manual Entry'
      });
      closeModal(modalAddWord);
      await loadData();
    } catch (err) {
      alert('Error saving word: ' + err.message);
    }
  });

  // --- Manage Categories Modal Handlers ---
  btnManageCats.addEventListener('click', () => {
    renderManageCategoriesList();
    openModal(modalManageCats);
    newCategoryInput.value = '';
  });

  function renderManageCategoriesList() {
    manageCatsList.innerHTML = '';
    allCategories.forEach((cat) => {
      const count = allWords.filter((w) => w.category === cat).length;
      const item = document.createElement('div');
      item.className = 'cat-manage-item';
      item.innerHTML = `
        <div>
          <span class="cat-manage-name">${escapeHtml(cat)}</span>
          <span class="cat-manage-count">(${count} words)</span>
        </div>
        <button class="cat-delete-btn" title="Delete category">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;

      item.querySelector('.cat-delete-btn').addEventListener('click', async () => {
        if (confirm(`Delete category "${cat}"? Words in this category will become Uncategorized.`)) {
          await StorageUtil.deleteCategory(cat);
          await loadData();
          renderManageCategoriesList();
        }
      });

      manageCatsList.appendChild(item);
    });
  }

  btnCreateCategory.addEventListener('click', async () => {
    const catName = newCategoryInput.value.trim();
    if (!catName) return;

    await StorageUtil.addCategory(catName);
    newCategoryInput.value = '';
    await loadData();
    renderManageCategoriesList();
  });

  newCategoryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnCreateCategory.click();
    }
  });

  // --- Settings & Prompt Template Modal Handlers ---
  btnSettings.addEventListener('click', async () => {
    settings = await StorageUtil.getSettings();
    settingsPromptTemplate.value = settings.promptTemplate || '';
    openModal(modalSettings);
  });

  btnResetTemplate.addEventListener('click', () => {
    settingsPromptTemplate.value = `Please rephrase the following text to sound more polished and articulate, naturally incorporating some or all of the following vocabulary words from the "{category}" collection:\n\nVocabulary words to incorporate:\n{words}\n\nText to rephrase:\n{text}`;
  });

  btnSaveSettings.addEventListener('click', async () => {
    const promptTemplate = settingsPromptTemplate.value;
    await StorageUtil.saveSettings({ promptTemplate });
    closeModal(modalSettings);
  });

  // Export JSON
  btnExportJson.addEventListener('click', async () => {
    const backupData = {
      vocab_items: await StorageUtil.getWords(),
      vocab_categories: await StorageUtil.getCategories(),
      vocab_settings: await StorageUtil.getSettings(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabsaver-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON
  btnImportTrigger.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed.vocab_items)) {
          throw new Error('Invalid VocabSaver backup file structure');
        }

        if (confirm(`Import ${parsed.vocab_items.length} words from backup? Existing words will be preserved.`)) {
          const currentWords = await StorageUtil.getWords();
          const currentCats = await StorageUtil.getCategories();

          // Merge without duplicate IDs
          const existingIds = new Set(currentWords.map((w) => w.id));
          const newWords = parsed.vocab_items.filter((w) => !existingIds.has(w.id));
          const mergedWords = [...newWords, ...currentWords];

          // Merge categories
          const catSet = new Set([...currentCats, ...(parsed.vocab_categories || [])]);

          await new Promise((res) => {
            chrome.storage.local.set(
              {
                vocab_items: mergedWords,
                vocab_categories: Array.from(catSet)
              },
              res
            );
          });

          await loadData();
          alert('Import completed successfully!');
          closeModal(modalSettings);
        }
      } catch (err) {
        alert('Failed to import: ' + err.message);
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Load initial data
  await loadData();
});
