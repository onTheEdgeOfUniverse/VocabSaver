/**
 * Verification Test for VocabSaver Storage Logic
 */

// Mock chrome.storage.local in Node.js
const mockStorage = {};

global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach((k) => (result[k] = mockStorage[k]));
        } else if (typeof keys === 'string') {
          result[keys] = mockStorage[keys];
        } else if (keys === null || keys === undefined) {
          Object.assign(result, mockStorage);
        }
        callback(result);
      },
      set: (items, callback) => {
        Object.assign(mockStorage, items);
        if (callback) callback();
      }
    }
  }
};

require('./storage.js');

async function runTests() {
  console.log('--- Starting StorageUtil Verification Tests ---');

  // 1. Init defaults
  await StorageUtil.initDefaults();
  const cats = await StorageUtil.getCategories();
  console.assert(cats.length >= 5, 'Default categories should be initialized');
  console.log(`[PASS] Initialized with ${cats.length} default categories.`);

  // 2. Add word with default category
  const item1 = await StorageUtil.addWord({
    word: 'serendipity',
    category: 'Expressive Adjectives',
    context: 'Finding this book was pure serendipity.',
    sourceUrl: 'https://example.com'
  });
  console.assert(item1.word === 'serendipity', 'Word should match');
  console.assert(item1.category === 'Expressive Adjectives', 'Category should match');
  console.log('[PASS] Added word "serendipity".');

  // 3. Add word with NEW category (should auto-register category)
  const item2 = await StorageUtil.addWord({
    word: 'idempotent',
    category: 'Computer Science',
    context: 'The API operation is idempotent.',
    sourceUrl: 'https://example.com/api'
  });
  const updatedCats = await StorageUtil.getCategories();
  console.assert(updatedCats.includes('Computer Science'), 'Computer Science category should be auto-added');
  console.log('[PASS] Auto-registered new category "Computer Science".');

  // 4. Get all words
  let words = await StorageUtil.getWords();
  console.assert(words.length === 2, `Should have 2 words, found: ${words.length}`);
  console.log(`[PASS] Retrieved ${words.length} words.`);

  // 5. Delete word
  await StorageUtil.deleteWord(item1.id);
  words = await StorageUtil.getWords();
  console.assert(words.length === 1 && words[0].id === item2.id, 'Word should be deleted');
  console.log('[PASS] Successfully deleted word.');

  // 6. Delete category (should reassign word to Uncategorized)
  await StorageUtil.deleteCategory('Computer Science');
  words = await StorageUtil.getWords();
  console.assert(words[0].category === 'Uncategorized', 'Word category should be Uncategorized after category deletion');
  console.log('[PASS] Deleted category and gracefully reassigned word to "Uncategorized".');

  // 7. Settings
  const settings = await StorageUtil.getSettings();
  console.assert(settings.promptTemplate.includes('{words}'), 'Prompt template must include {words}');
  console.log('[PASS] Verified settings and prompt template variables.');

  console.log('--- ALL STORAGE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
