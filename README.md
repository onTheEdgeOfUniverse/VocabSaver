# VocabSaver 🚀 - AI Vocabulary Collector & Rephraser

A powerful Chrome Extension (Manifest V3) that lets you capture vocabulary and phrases from any web page, organize them into custom categories, and seamlessly inject them with AI rephrasing prompts directly into AI chat interfaces (ChatGPT, Claude, Gemini, Perplexity, etc.).

---

## ✨ Features

1. **Highlight & Save Anywhere**:
   - Highlight any word or phrase on any webpage to see a sleek floating mini-pill (`Save Vocab`).
   - Click to open the quick-save dialog (isolated in Shadow DOM so webpage styles never break it).
   - Select an existing category or type a new one on the fly.
   - Automatically captures the sentence context and source page URL.
   - Also available via Right-Click Context Menu (`Save to VocabSaver`).

2. **AI Chat Interface Assistant**:
   - Detected on AI chat services: ChatGPT (`chatgpt.com`), Claude (`claude.ai`), Google Gemini (`gemini.google.com`), Perplexity (`perplexity.ai`), Poe, Mistral, DeepSeek, and more.
   - Sleek floating **Vocab Prompt** launcher or press `Alt + V` on any webpage.
   - Pick any category to view its words with checkable chips.
   - **Rephrase Prompt**: Automatically wraps your saved words into an AI prompt instructing the model to polish your text using that vocabulary.
   - **Smart Insertion**: Multi-strategy text injector handles `contenteditable`, ProseMirror, Lexical, and React controlled inputs, activating the AI's "Send" button.

3. **Extension Popup & Management**:
   - Real-time search across saved words, categories, and context snippets.
   - Filter words by category pills with live counts.
   - Add words manually with custom example sentences.
   - Manage categories: add, rename, and delete categories safely.
   - One-click copy and delete for any vocabulary card.
   - Customizable AI prompt template with dynamic `{words}`, `{category}`, and `{text}` tags.
   - Full JSON Export & Import backup support.

---

## 🛠️ How to Install in Google Chrome

1. Open **Google Chrome**.
2. Navigate to `chrome://extensions/` in the URL bar.
3. In the top-right corner, toggle on **Developer mode**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select this folder:
   ```
   c:\Users\Sai Krishna\Desktop\Tech Projects\VocabSaver
   ```
6. VocabSaver will now appear in your extensions list and on your Chrome toolbar! (Click the puzzle icon to pin it).

---

## 📖 How to Use

### 1. Saving Vocabulary while Reading
1. Browse any article or website (e.g., Wikipedia, Medium, news sites).
2. Highlight a word or phrase with your mouse.
3. Click the floating **Save Vocab** pill that pops up next to your selection.
4. Choose a category (or create a new one) and click **Save Word**.
5. Alternatively, right-click any highlighted text and select **VocabSaver** -> **Save to...**.

### 2. Using Vocabulary in AI Chats (ChatGPT, Claude, Gemini)
1. Open [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com).
2. Type or paste your draft message into the chat box (or leave it blank).
3. Look at the bottom-right corner for the floating **Vocab Prompt** badge (or press `Alt + V`).
4. Select a category (e.g., *Business & Professional* or *Academic & GRE*).
5. Choose your desired prompt style:
   - **✨ Rephrase with Words**: Wraps the words around your current draft to ask the AI to rephrase it with the vocabulary.
   - **📝 Draft New Text**: Asks the AI to generate a response incorporating the vocabulary.
   - **📋 Insert Words Only**: Injects just the vocabulary list.
6. Click **Insert into Chat**! The prompt is automatically injected into the chat box, ready to send.

### 3. Managing Words & Categories
1. Click the **VocabSaver** extension icon in your Chrome toolbar.
2. Filter words by clicking category chips or use the instant search bar.
3. Click `+` to add words manually.
4. Click the folder icon to add or delete categories.
5. Click the gear icon to customize the AI prompt template or export your vocabulary as a JSON backup.
