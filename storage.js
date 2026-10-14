/**
 * VocabSaver - Storage Utility
 * Manages vocabulary items, categories, and extension settings via chrome.storage.local
 */

const DEFAULT_CATEGORIES = [
  'Business & Professional',
  'Academic & GRE',
  'Idioms & Phrases',
  'Expressive Adjectives',
  'Tech & Engineering'
];

const DEFAULT_SETTINGS = {
  promptTemplate: `Please rephrase the following text to sound more polished and articulate, naturally incorporating some or all of the following vocabulary words from the "{category}" collection:

Vocabulary words to incorporate:
{words}

Text to rephrase:
{text}`,
  showFloatingButton: true,
  autoCaptureContext: true
};

const StorageUtil = {
  /**
   * Initialize default categories and settings if not present
   */
  async initDefaults() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_categories', 'vocab_settings', 'vocab_items'], (res) => {
        res = res || {};
        const updates = {};
        if (!res.vocab_categories || !Array.isArray(res.vocab_categories) || res.vocab_categories.length === 0) {
          updates.vocab_categories = DEFAULT_CATEGORIES;
        }
        if (!res.vocab_settings) {
          updates.vocab_settings = DEFAULT_SETTINGS;
        }
        if (!res.vocab_items) {
          updates.vocab_items = [];
        }

        if (Object.keys(updates).length > 0) {
          chrome.storage.local.set(updates, () => resolve(true));
        } else {
          resolve(false);
        }
      });
    });
  },

  /**
   * Get all vocabulary items
   * @returns {Promise<Array>}
   */
  async getWords() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_items'], (res) => {
        res = res || {};
        resolve(res.vocab_items || []);
      });
    });
  },

  /**
   * Add a new vocabulary item
   * @param {Object} item - { word, category, context, sourceUrl, sourceTitle }
   * @returns {Promise<Object>} The saved item
   */
  async addWord(item) {
    return new Promise((resolve, reject) => {
      if (!item || !item.word || !item.word.trim()) {
        return reject(new Error('Word cannot be empty'));
      }

      const cleanWord = item.word.trim();
      const cleanCategory = (item.category && item.category.trim()) || 'Uncategorized';

      chrome.storage.local.get(['vocab_items', 'vocab_categories'], (res) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        res = res || {};
        const items = res.vocab_items || [];
        const categories = res.vocab_categories || DEFAULT_CATEGORIES;

        // Auto-add category to category list if new
        let categoriesUpdated = false;
        if (cleanCategory !== 'Uncategorized' && !categories.includes(cleanCategory)) {
          categories.push(cleanCategory);
          categoriesUpdated = true;
        }

        const newItem = {
          id: 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          word: cleanWord,
          category: cleanCategory,
          context: (item.context && item.context.trim()) || '',
          sourceUrl: item.sourceUrl || '',
          sourceTitle: item.sourceTitle || '',
          createdAt: new Date().toISOString()
        };

        items.unshift(newItem); // newest first

        const payload = { vocab_items: items };
        if (categoriesUpdated) {
          payload.vocab_categories = categories;
        }

        chrome.storage.local.set(payload, () => {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(newItem);
        });
      });
    });
  },

  /**
   * Delete a vocabulary item by ID
   * @param {string} id
   */
  async deleteWord(id) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_items'], (res) => {
        res = res || {};
        const items = res.vocab_items || [];
        const filtered = items.filter((w) => w.id !== id);
        chrome.storage.local.set({ vocab_items: filtered }, () => resolve(true));
      });
    });
  },

  /**
   * Update an existing vocabulary item
   * @param {string} id
   * @param {Object} updates - fields to update
   */
  async updateWord(id, updates) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['vocab_items'], (res) => {
        res = res || {};
        const items = res.vocab_items || [];
        const index = items.findIndex((w) => w.id === id);
        if (index === -1) return reject(new Error('Item not found'));

        items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
        chrome.storage.local.set({ vocab_items: items }, () => resolve(items[index]));
      });
    });
  },

  /**
   * Get all categories
   * @returns {Promise<Array<string>>}
   */
  async getCategories() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_categories'], (res) => {
        res = res || {};
        resolve(res.vocab_categories || DEFAULT_CATEGORIES);
      });
    });
  },

  /**
   * Add a new category
   * @param {string} categoryName
   */
  async addCategory(categoryName) {
    return new Promise((resolve, reject) => {
      if (!categoryName || !categoryName.trim()) {
        return reject(new Error('Category name cannot be empty'));
      }
      const cleanName = categoryName.trim();

      chrome.storage.local.get(['vocab_categories'], (res) => {
        res = res || {};
        const categories = res.vocab_categories || [...DEFAULT_CATEGORIES];
        if (categories.includes(cleanName)) {
          return resolve(categories); // already exists
        }
        categories.push(cleanName);
        chrome.storage.local.set({ vocab_categories: categories }, () => resolve(categories));
      });
    });
  },

  /**
   * Delete a category and optionally reassign its words to 'Uncategorized'
   * @param {string} categoryName
   */
  async deleteCategory(categoryName) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_categories', 'vocab_items'], (res) => {
        res = res || {};
        let categories = res.vocab_categories || [];
        categories = categories.filter((c) => c !== categoryName);

        let items = res.vocab_items || [];
        items = items.map((item) => {
          if (item.category === categoryName) {
            return { ...item, category: 'Uncategorized' };
          }
          return item;
        });

        chrome.storage.local.set({ vocab_categories: categories, vocab_items: items }, () => {
          resolve(true);
        });
      });
    });
  },

  /**
   * Rename a category
   * @param {string} oldName
   * @param {string} newName
   */
  async renameCategory(oldName, newName) {
    return new Promise((resolve, reject) => {
      const cleanNew = newName.trim();
      if (!cleanNew) return reject(new Error('Category name cannot be empty'));

      chrome.storage.local.get(['vocab_categories', 'vocab_items'], (res) => {
        res = res || {};
        let categories = res.vocab_categories || [];
        const index = categories.indexOf(oldName);
        if (index !== -1) {
          categories[index] = cleanNew;
        }

        let items = res.vocab_items || [];
        items = items.map((item) => {
          if (item.category === oldName) {
            return { ...item, category: cleanNew };
          }
          return item;
        });

        chrome.storage.local.set({ vocab_categories: categories, vocab_items: items }, () => {
          resolve(true);
        });
      });
    });
  },

  /**
   * Get settings
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_settings'], (res) => {
        res = res || {};
        resolve({ ...DEFAULT_SETTINGS, ...(res.vocab_settings || {}) });
      });
    });
  },

  /**
   * Save settings
   */
  async saveSettings(newSettings) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['vocab_settings'], (res) => {
        res = res || {};
        const merged = { ...DEFAULT_SETTINGS, ...(res.vocab_settings || {}), ...newSettings };
        chrome.storage.local.set({ vocab_settings: merged }, () => resolve(merged));
      });
    });
  },

  /**
   * Get theme colors for a category
   * @param {string} category
   * @returns {{ text: string, bg: string, border: string, dot: string }}
   */
  getCategoryColor(category) {
    const CATEGORY_COLORS = {
      'Academic & GRE': { text: '#a5b4fc', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', dot: '#818cf8' },
      'Business & Professional': { text: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', dot: '#34d399' },
      'Tech & Engineering': { text: '#67e8f9', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)', dot: '#22d3ee' },
      'Idioms & Phrases': { text: '#fcd34d', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', dot: '#fbbf24' },
      'Expressive Adjectives': { text: '#f472b6', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)', dot: '#fb7185' },
      'Uncategorized': { text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.28)', dot: '#94a3b8' }
    };

    if (category && CATEGORY_COLORS[category]) {
      return CATEGORY_COLORS[category];
    }

    const PALETTE = [
      { text: '#a5b4fc', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', dot: '#818cf8' },
      { text: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', dot: '#34d399' },
      { text: '#67e8f9', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)', dot: '#22d3ee' },
      { text: '#fcd34d', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', dot: '#fbbf24' },
      { text: '#f472b6', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)', dot: '#fb7185' },
      { text: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', dot: '#c084fc' },
      { text: '#38bdf8', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.35)', dot: '#38bdf8' }
    ];

    if (!category || category === 'Uncategorized') {
      return CATEGORY_COLORS['Uncategorized'];
    }

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % PALETTE.length;
    return PALETTE[idx];
  }
};

// Expose on globalThis, window, and self for browser content script, popup, and service worker
if (typeof globalThis !== 'undefined') {
  globalThis.StorageUtil = StorageUtil;
}
if (typeof window !== 'undefined') {
  window.StorageUtil = StorageUtil;
}
if (typeof self !== 'undefined') {
  self.StorageUtil = StorageUtil;
}
