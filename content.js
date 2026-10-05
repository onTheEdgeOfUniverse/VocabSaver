/**
 * VocabSaver - Content Script
 * 1. Highlights & Word/Phrase Annotation with Floating Pill & Quick-Save Dialog
 * 2. AI Chat Interface Detection & Smart Vocabulary/Prompt Injector
 */

(function () {
  'use strict';

  // Only run in top-level window to avoid duplicate execution in iframes
  if (window !== window.top) return;

  // Prevent multiple injections/listeners on the same page
  if (window.__vocabsaver_active) return;
  window.__vocabsaver_active = true;

  console.log('[VocabSaver] Content script active on:', window.location.hostname);

  // AI Chat hostnames list
  const AI_DOMAINS = [
    'chatgpt.com',
    'chat.openai.com',
    'claude.ai',
    'gemini.google.com',
    'perplexity.ai',
    'poe.com',
    'chat.mistral.ai',
    'chat.deepseek.com',
    'huggingface.co',
    'copilot.microsoft.com',
    'groq.com'
  ];

  const isAiDomain = AI_DOMAINS.some((domain) => window.location.hostname.includes(domain));

  // --- Scoped CSS for Shadow DOM ---
  const SHARED_STYLES = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating Pill Button */
    .vs-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #121215;
      color: #f4f4f5;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12);
      border: none;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      animation: vsPopIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }
    .vs-pill:hover {
      background: #1a1a20;
      box-shadow: 0 6px 22px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.22);
      transform: translateY(-1px);
      color: #ffffff;
    }
    .vs-pill:active {
      transform: translateY(0);
    }
    .vs-pill svg {
      width: 13px;
      height: 13px;
      color: #818cf8;
      flex-shrink: 0;
    }

    /* Quick Save Modal Card */
    .vs-modal-card {
      position: relative;
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #121215;
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
      padding: 16px;
      animation: vsPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .vs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .vs-title {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #fafafa;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .vs-close-btn {
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: color 0.12s, background 0.12s;
    }
    .vs-close-btn:hover {
      color: #f4f4f5;
      background: rgba(255, 255, 255, 0.08);
    }

    .vs-label {
      font-size: 10.5px;
      font-weight: 600;
      color: #71717a;
      margin-bottom: 5px;
      display: block;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .vs-select, .vs-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 7px;
      color: #f4f4f5;
      font-size: 12.5px;
      padding: 7px 10px;
      margin-bottom: 12px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .vs-select:focus, .vs-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      background: rgba(255, 255, 255, 0.05);
    }

    .vs-context-preview {
      font-size: 11.5px;
      color: #a1a1aa;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-left: 2px solid rgba(99, 102, 241, 0.7);
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 14px;
      line-height: 1.45;
      max-height: 60px;
      overflow-y: auto;
      font-style: italic;
    }

    .vs-actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
    }
    .vs-btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #d4d4d8;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 12px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .vs-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      color: #ffffff;
    }
    .vs-btn-primary {
      background: #4f46e5;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
      transition: background 0.15s, transform 0.1s;
    }
    .vs-btn-primary:hover {
      background: #4338ca;
      transform: translateY(-0.5px);
    }
    .vs-btn-primary:active {
      transform: translateY(0);
    }

    /* AI Dock Button */
    .vs-ai-launcher {
      display: flex;
      align-items: center;
      gap: 7px;
      background: #111114;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f4f4f5;
      padding: 7px 14px;
      border-radius: 9999px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .vs-ai-launcher:hover {
      background: #18181c;
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
    }
    .vs-ai-icon-badge {
      width: 18px;
      height: 18px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #818cf8;
    }
    .vs-ai-icon-badge svg {
      width: 11px;
      height: 11px;
      fill: currentColor;
    }

    /* AI Drawer Panel */
    .vs-ai-drawer {
      position: fixed;
      bottom: 76px;
      right: 24px;
      width: 380px;
      max-height: 560px;
      background: #111114;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: vsSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483647;
      color: #f4f4f5;
    }
    .vs-ai-drawer-header {
      padding: 12px 16px;
      background: #151519;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .vs-ai-drawer-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .vs-ai-drawer-title span {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #818cf8;
      font-size: 9.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      letter-spacing: 0.03em;
    }
    .vs-ai-drawer-content {
      padding: 14px 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Categories Selector Grid */
    .vs-categories-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 110px;
      overflow-y: auto;
      padding: 1px;
    }
    .vs-cat-chip {
      padding: 4px 9px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 500;
      color: #d4d4d8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .vs-cat-chip:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .vs-cat-chip.active {
      background: #4f46e5;
      border-color: #6366f1;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);
    }
    .vs-cat-count {
      font-size: 9.5px;
      opacity: 0.75;
    }

    /* Words in category */
    .vs-words-section {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 9px 11px;
    }
    .vs-words-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .vs-words-subhead {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #71717a;
    }
    .vs-toggle-all {
      font-size: 10.5px;
      color: #818cf8;
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
    }
    .vs-words-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      max-height: 100px;
      overflow-y: auto;
    }
    .vs-word-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 3px 7px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 5px;
      color: #d4d4d8;
      cursor: pointer;
      transition: all 0.12s;
      user-select: none;
    }
    .vs-word-badge:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .vs-word-badge.checked {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
      font-weight: 500;
    }

    /* Mode selector */
    .vs-mode-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .vs-mode-btn {
      padding: 7px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 7px;
      color: #a1a1aa;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .vs-mode-btn.active {
      background: rgba(99, 102, 241, 0.12);
      border-color: rgba(99, 102, 241, 0.4);
      color: #818cf8;
      font-weight: 600;
    }

    /* Custom prompt preview / editor */
    .vs-prompt-preview {
      width: 100%;
      height: 75px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 7px;
      color: #d4d4d8;
      font-size: 11px;
      line-height: 1.4;
      padding: 7px 9px;
      resize: none;
      outline: none;
    }
    .vs-prompt-preview:focus {
      border-color: #6366f1;
    }

    .vs-ai-footer {
      padding: 10px 16px;
      background: #151519;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .vs-ai-status {
      font-size: 10.5px;
      color: #71717a;
    }
    .vs-inject-btn {
      background: #4f46e5;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
      transition: background 0.15s, transform 0.1s;
    }
    .vs-inject-btn:hover {
      background: #4338ca;
      transform: translateY(-0.5px);
    }
    .vs-inject-btn:active {
      transform: translateY(0);
    }

    /* Toast Notification */
    .vs-toast {
      background: #121215;
      color: #f4f4f5;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12.5px;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: vsFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Animations */
    @keyframes vsPopIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes vsSlideUp {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes vsFadeUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  // --- Sentence Context Helper ---
  function getSurroundingSentence(selection) {
    try {
      if (!selection || selection.rangeCount === 0) return '';
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return '';

      let text = anchorNode.textContent || '';
      if (text.length < 30 && anchorNode.parentElement) {
        const parent = anchorNode.parentElement;
        if (parent && parent.textContent && parent.textContent.length < 1200) {
          text = parent.textContent;
        }
      }
      const selected = selection.toString().trim();
      if (!selected) return '';

      const idx = text.indexOf(selected);
      if (idx === -1) return selected;

      const start = Math.max(0, idx - 60);
      const end = Math.min(text.length, idx + selected.length + 60);
      let snippet = text.substring(start, end).replace(/\s+/g, ' ').trim();
      if (start > 0) snippet = '...' + snippet;
      if (end < text.length) snippet = snippet + '...';
      return snippet;
    } catch (e) {
      return '';
    }
  }

  // --- Toast Manager ---
  let toastContainerHost = null;
  let toastShadowRoot = null;
  let toastTimer = null;

  function showToast(message, icon = '✓') {
    if (!message) return;

    // DOM-level deduplication: prevent identical toasts within 1500ms or any toast within 300ms
    const now = Date.now();
    const root = document.documentElement || document.body;
    if (root) {
      const lastMsg = root.getAttribute('data-vs-last-toast');
      const lastTime = parseInt(root.getAttribute('data-vs-last-toast-time') || '0', 10);
      if (lastMsg === message && now - lastTime < 1500) {
        return;
      }
      if (now - lastTime < 300) {
        return;
      }
      root.setAttribute('data-vs-last-toast', message);
      root.setAttribute('data-vs-last-toast-time', String(now));
    }

    if (!toastContainerHost || !toastContainerHost.parentElement) {
      // Remove any duplicate/stale toast hosts that may exist in DOM
      document.querySelectorAll('vocabsaver-toast-container').forEach((el) => el.remove());

      toastContainerHost = document.createElement('vocabsaver-toast-container');
      toastShadowRoot = toastContainerHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = SHARED_STYLES;
      toastShadowRoot.appendChild(style);
      (document.documentElement || document.body).appendChild(toastContainerHost);
    }

    // Always clear previous toasts so they NEVER stack or duplicate!
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    while (toastShadowRoot.childNodes.length > 1) {
      toastShadowRoot.removeChild(toastShadowRoot.lastChild);
    }

    const toast = document.createElement('div');
    toast.className = 'vs-toast';
    toast.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:9999px; background:rgba(16,185,129,0.15); color:#10b981; font-size:10px; font-weight:700;">✓</span> <span>${escapeHtml(message)}</span>`;
    toastShadowRoot.appendChild(toast);

    toastTimer = setTimeout(() => {
      toast.style.transition = 'opacity 0.25s, transform 0.25s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
        if (toastShadowRoot && toastShadowRoot.querySelectorAll('.vs-toast').length === 0) {
          if (toastContainerHost && toastContainerHost.parentElement) {
            toastContainerHost.remove();
            toastContainerHost = null;
            toastShadowRoot = null;
          }
        }
      }, 250);
    }, 2500);
  }

  // --- Storage Helper ---
  function getStorageUtil() {
    if (typeof StorageUtil !== 'undefined') return StorageUtil;
    if (typeof globalThis !== 'undefined' && globalThis.StorageUtil) return globalThis.StorageUtil;
    if (typeof window !== 'undefined' && window.StorageUtil) return window.StorageUtil;
    if (typeof self !== 'undefined' && self.StorageUtil) return self.StorageUtil;
    return null;
  }

  // --- Text Selection & Quick-Save Tooltip ---
  let selectionHost = null;
  let selectionShadowRoot = null;
  let currentSelectionData = null;
  let isDialogOpen = false;
  let isSavingWord = false;
  let pillOriginScrollY = 0;
  let pillOriginScrollX = 0;
  let pillOriginRectTop = 0;
  let pillShownAt = 0;
  let lastScrollTime = 0;

  function ensureSelectionHost() {
    if (!selectionHost || !selectionHost.parentElement) {
      document.querySelectorAll('vocabsaver-selection-container').forEach((el) => el.remove());

      selectionHost = document.createElement('vocabsaver-selection-container');
      selectionShadowRoot = selectionHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = SHARED_STYLES;
      selectionShadowRoot.appendChild(style);

      (document.documentElement || document.body).appendChild(selectionHost);
    }
  }

  function clearSelectionUi() {
    if (isDialogOpen) return;
    currentSelectionData = null;
    if (selectionHost && selectionHost.parentElement) {
      selectionHost.remove();
      selectionHost = null;
      selectionShadowRoot = null;
    }
  }

  function forceCloseDialog() {
    isDialogOpen = false;
    currentSelectionData = null;
    if (selectionHost && selectionHost.parentElement) {
      selectionHost.remove();
      selectionHost = null;
      selectionShadowRoot = null;
    }
  }

  function handleSelectionChange() {
    if (isDialogOpen) return;

    // Avoid popping up while user is actively scrolling
    if (Date.now() - lastScrollTime < 120 && !selectionHost) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      clearSelectionUi();
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 1 || text.length > 250) {
      clearSelectionUi();
      return;
    }

    // Ignore if selection is inside editable inputs or VocabSaver UI
    try {
      const anchor = selection.anchorNode;
      if (anchor) {
        const parentEl = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
        if (parentEl) {
          if (
            parentEl.closest('input, textarea, [contenteditable="true"]') ||
            parentEl.closest('vocabsaver-selection-container, vocabsaver-ai-dock, vocabsaver-toast-container')
          ) {
            return;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    let rect = null;
    try {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects && rects.length > 0) {
        rect = rects[rects.length - 1];
      } else {
        rect = range.getBoundingClientRect();
      }
    } catch (e) {
      return;
    }

    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    currentSelectionData = {
      word: text,
      context: getSurroundingSentence(selection),
      rect: rect,
      sourceUrl: window.location.href,
      sourceTitle: document.title || window.location.hostname
    };

    renderPill(rect);
  }

  function renderPill(rect) {
    ensureSelectionHost();
    isDialogOpen = false;

    // Track scroll coordinates and rect for scroll dismissal
    pillOriginScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    pillOriginScrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    pillOriginRectTop = rect.top;
    pillShownAt = Date.now();

    while (selectionShadowRoot.childNodes.length > 1) {
      selectionShadowRoot.removeChild(selectionShadowRoot.lastChild);
    }

    const pill = document.createElement('div');
    pill.className = 'vs-pill';
    pill.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>Save Vocab</span>
    `;

    const pillWidth = 108;
    const pillHeight = 28;

    let top = rect.top - pillHeight - 8;
    if (top < 10) {
      top = rect.bottom + 8;
    }

    let left = rect.right - pillWidth + 20;
    if (left < 10) left = 10;
    if (left + pillWidth > window.innerWidth - 10) {
      left = window.innerWidth - pillWidth - 10;
    }

    selectionHost.style.setProperty('position', 'fixed', 'important');
    selectionHost.style.setProperty('z-index', '2147483647', 'important');
    selectionHost.style.setProperty('display', 'block', 'important');
    selectionHost.style.setProperty('left', `${Math.round(left)}px`, 'important');
    selectionHost.style.setProperty('top', `${Math.round(top)}px`, 'important');
    selectionHost.style.setProperty('width', 'auto', 'important');
    selectionHost.style.setProperty('height', 'auto', 'important');
    selectionHost.style.setProperty('margin', '0', 'important');
    selectionHost.style.setProperty('padding', '0', 'important');
    selectionHost.style.setProperty('border', 'none', 'important');
    selectionHost.style.setProperty('pointer-events', 'auto', 'important');

    pill.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openQuickSaveDialog();
    });

    selectionShadowRoot.appendChild(pill);
  }

  async function openQuickSaveDialog(customText) {
    // If extension context has been invalidated, alert user to refresh
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
        alert('VocabSaver extension was updated.\n\nPlease refresh this webpage (F5 or Ctrl+R) to reconnect.');
        return;
      }
    } catch (e) {}

    ensureSelectionHost();
    isDialogOpen = true;

    if (customText) {
      currentSelectionData = {
        word: customText,
        context: '',
        rect: {
          left: window.innerWidth / 2 - 160,
          right: window.innerWidth / 2 + 160,
          top: window.innerHeight / 2 - 140,
          bottom: window.innerHeight / 2 + 140
        },
        sourceUrl: window.location.href,
        sourceTitle: document.title || window.location.hostname
      };
    }

    if (!currentSelectionData) return;

    let categories = [];
    try {
      const storage = getStorageUtil();
      if (storage) {
        categories = await storage.getCategories();
      }
    } catch (e) {
      console.warn('[VocabSaver] Failed to fetch categories from storage:', e);
    }
    if (!categories || categories.length === 0) {
      categories = [
        'Business & Professional',
        'Academic & GRE',
        'Idioms & Phrases',
        'Expressive Adjectives',
        'Tech & Engineering'
      ];
    }

    while (selectionShadowRoot.childNodes.length > 1) {
      selectionShadowRoot.removeChild(selectionShadowRoot.lastChild);
    }

    const modalWidth = 320;
    const modalHeight = 290;
    const rect = currentSelectionData.rect;

    let left = rect.left;
    if (left + modalWidth > window.innerWidth - 16) {
      left = window.innerWidth - modalWidth - 16;
    }
    if (left < 16) left = 16;

    let top = rect.bottom + 8;
    if (top + modalHeight > window.innerHeight - 16) {
      top = Math.max(16, rect.top - modalHeight - 8);
    }

    selectionHost.style.setProperty('position', 'fixed', 'important');
    selectionHost.style.setProperty('z-index', '2147483647', 'important');
    selectionHost.style.setProperty('display', 'block', 'important');
    selectionHost.style.setProperty('left', `${Math.round(left)}px`, 'important');
    selectionHost.style.setProperty('top', `${Math.round(top)}px`, 'important');
    selectionHost.style.setProperty('width', 'auto', 'important');
    selectionHost.style.setProperty('height', 'auto', 'important');
    selectionHost.style.setProperty('pointer-events', 'auto', 'important');

    const card = document.createElement('div');
    card.className = 'vs-modal-card';
    card.innerHTML = `
      <div class="vs-header">
        <div class="vs-title">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #818cf8;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span>VocabSaver</span>
        </div>
        <button class="vs-close-btn" id="vs-close-dialog" title="Close (Esc)">✕</button>
      </div>

      <div style="margin-bottom: 10px;">
        <label class="vs-label">Word / Phrase</label>
        <input type="text" class="vs-input" id="vs-word-input" value="${escapeHtml(currentSelectionData.word)}" style="margin-bottom:0; font-weight:600; color:#fafafa;">
      </div>

      <label class="vs-label">Category</label>
      <select class="vs-select" id="vs-category-select">
        <option value="Uncategorized">Uncategorized</option>
        ${categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
        <option value="__NEW__">+ Create New Category...</option>
      </select>

      <div id="vs-new-cat-container" style="display:none;">
        <label class="vs-label">New Category Name</label>
        <input type="text" class="vs-input" id="vs-new-category-input" placeholder="e.g., Literature, GRE, Tech...">
      </div>

      ${
        currentSelectionData.context
          ? `<label class="vs-label">Context</label>
             <div class="vs-context-preview">${escapeHtml(currentSelectionData.context)}</div>`
          : ''
      }

      <div class="vs-actions">
        <button class="vs-btn-secondary" id="vs-cancel-btn" type="button">Cancel</button>
        <button class="vs-btn-primary" id="vs-save-btn" type="button">Save Word</button>
      </div>
    `;

    card.addEventListener('mousedown', (e) => e.stopPropagation());
    card.addEventListener('mouseup', (e) => e.stopPropagation());
    card.addEventListener('click', (e) => e.stopPropagation());

    selectionShadowRoot.appendChild(card);

    const closeBtn = card.querySelector('#vs-close-dialog');
    const cancelBtn = card.querySelector('#vs-cancel-btn');
    const saveBtn = card.querySelector('#vs-save-btn');
    const wordInput = card.querySelector('#vs-word-input');
    const categorySelect = card.querySelector('#vs-category-select');
    const newCatContainer = card.querySelector('#vs-new-cat-container');
    const newCatInput = card.querySelector('#vs-new-category-input');

    closeBtn.addEventListener('click', forceCloseDialog);
    cancelBtn.addEventListener('click', forceCloseDialog);

    categorySelect.addEventListener('change', () => {
      if (categorySelect.value === '__NEW__') {
        newCatContainer.style.display = 'block';
        newCatInput.focus();
      } else {
        newCatContainer.style.display = 'none';
      }
    });

    async function executeSave() {
      if (isSavingWord) return;

      const finalWord = wordInput.value.trim();
      if (!finalWord) {
        wordInput.focus();
        return;
      }

      isSavingWord = true;
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      let chosenCategory = categorySelect.value;
      if (chosenCategory === '__NEW__') {
        chosenCategory = newCatInput.value.trim() || 'Uncategorized';
      }

      try {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
          throw new Error('Extension context invalidated. Please refresh this webpage (F5 or Ctrl+R) to reconnect VocabSaver.');
        }

        const storage = getStorageUtil();
        if (!storage) {
          throw new Error('Storage module unavailable. Please refresh this webpage (F5 or Ctrl+R).');
        }

        await storage.addWord({
          word: finalWord,
          category: chosenCategory,
          context: currentSelectionData ? currentSelectionData.context : '',
          sourceUrl: currentSelectionData ? currentSelectionData.sourceUrl : window.location.href,
          sourceTitle: currentSelectionData ? currentSelectionData.sourceTitle : (document.title || '')
        });

        forceCloseDialog();

        // Clear selection range from document so the floating pill doesn't re-trigger
        try {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
          }
        } catch (e) {}

        showToast(`Saved "${finalWord}" to ${chosenCategory}!`);
      } catch (err) {
        console.error('[VocabSaver] Save word error:', err);
        const errMsg = err && err.message ? err.message : String(err);
        if (errMsg.includes('Extension context invalidated') || !chrome?.runtime?.id) {
          alert('VocabSaver extension was updated or reloaded.\n\nPlease refresh this webpage (F5 or Ctrl+R) to reconnect.');
        } else {
          alert('Failed to save word: ' + errMsg);
        }
        saveBtn.textContent = 'Save Word';
        saveBtn.disabled = false;
      } finally {
        setTimeout(() => {
          isSavingWord = false;
        }, 500);
      }
    }

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeSave();
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        executeSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        forceCloseDialog();
      }
    });

    saveBtn.focus();
  }

  // --- AI Chat Assistant Integration Widget ---
  let aiDockHost = null;
  let aiDockShadowRoot = null;
  let aiDrawerOpen = false;
  let selectedCategory = null;
  let selectedWords = new Set();
  let currentPromptMode = 'rephrase';

  function initAiChatWidget() {
    if (aiDockHost || document.querySelector('vocabsaver-ai-dock')) return;

    aiDockHost = document.createElement('vocabsaver-ai-dock');
    aiDockShadowRoot = aiDockHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = SHARED_STYLES;
    aiDockShadowRoot.appendChild(style);

    const launcher = document.createElement('div');
    launcher.className = 'vs-ai-launcher';
    launcher.innerHTML = `
      <div class="vs-ai-icon-badge">
        <svg viewBox="0 0 24 24">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
        </svg>
      </div>
      <span>Vocab Prompt</span>
    `;

    launcher.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAiDrawer();
    });

    aiDockShadowRoot.appendChild(launcher);
    (document.documentElement || document.body).appendChild(aiDockHost);
  }

  async function toggleAiDrawer() {
    aiDrawerOpen = !aiDrawerOpen;
    const existingDrawer = aiDockShadowRoot ? aiDockShadowRoot.querySelector('.vs-ai-drawer') : null;
    if (!aiDrawerOpen) {
      if (existingDrawer) existingDrawer.remove();
      return;
    }

    if (existingDrawer) existingDrawer.remove();
    await renderAiDrawer();
  }

  async function renderAiDrawer() {
    const categories = await globalThis.StorageUtil.getCategories();
    const allWords = await globalThis.StorageUtil.getWords();
    const settings = await globalThis.StorageUtil.getSettings();

    const wordsByCategory = {};
    categories.forEach((c) => (wordsByCategory[c] = []));
    wordsByCategory['Uncategorized'] = [];

    allWords.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      if (!wordsByCategory[cat]) wordsByCategory[cat] = [];
      wordsByCategory[cat].push(item.word);
    });

    if (!selectedCategory || !wordsByCategory[selectedCategory]) {
      const firstWithWords = categories.find((c) => wordsByCategory[c] && wordsByCategory[c].length > 0);
      selectedCategory = firstWithWords || categories[0] || 'Uncategorized';
    }

    const currentCategoryWords = wordsByCategory[selectedCategory] || [];
    selectedWords = new Set(currentCategoryWords);

    const drawer = document.createElement('div');
    drawer.className = 'vs-ai-drawer';

    function buildDrawerHtml() {
      const wordsInCat = wordsByCategory[selectedCategory] || [];
      const wordsListStr = Array.from(selectedWords).join(', ');

      let promptPreviewText = '';
      if (currentPromptMode === 'rephrase') {
        promptPreviewText = (settings.promptTemplate || '')
          .replace('{category}', selectedCategory)
          .replace('{words}', wordsListStr || '[No words selected]')
          .replace('{text}', '[Your text here or current chat prompt]');
      } else if (currentPromptMode === 'draft') {
        promptPreviewText = `Please write a comprehensive response incorporating the following vocabulary words from the "${selectedCategory}" category naturally:\n\nVocabulary words: ${wordsListStr}`;
      } else if (currentPromptMode === 'list') {
        promptPreviewText = `Vocabulary words (${selectedCategory}):\n${wordsListStr}`;
      } else {
        promptPreviewText = `Use these vocabulary words: ${wordsListStr}`;
      }

      return `
        <div class="vs-ai-drawer-header">
          <div class="vs-ai-drawer-title">
            <svg style="width:16px;height:16px;fill:#818cf8;" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
            </svg>
            <span>VocabSaver</span> AI Assistant
          </div>
          <button class="vs-close-btn" id="vs-ai-close">✕</button>
        </div>

        <div class="vs-ai-drawer-content">
          <div>
            <label class="vs-label">Select Category</label>
            <div class="vs-categories-pills">
              <div class="vs-cat-chip ${selectedCategory === 'Uncategorized' ? 'active' : ''}" data-cat="Uncategorized">
                Uncategorized
                <span class="vs-cat-count">${(wordsByCategory['Uncategorized'] || []).length}</span>
              </div>
              ${categories
                .map(
                  (c) => `
                <div class="vs-cat-chip ${selectedCategory === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">
                  ${escapeHtml(c)}
                  <span class="vs-cat-count">${(wordsByCategory[c] || []).length}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="vs-words-section">
            <div class="vs-words-header">
              <span class="vs-words-subhead">${escapeHtml(selectedCategory)} (${wordsInCat.length} words)</span>
              ${
                wordsInCat.length > 0
                  ? `<button class="vs-toggle-all" id="vs-toggle-all-words">${
                      selectedWords.size === wordsInCat.length ? 'Deselect All' : 'Select All'
                    }</button>`
                  : ''
              }
            </div>
            <div class="vs-words-chips">
              ${
                wordsInCat.length === 0
                  ? `<span style="font-size:12px;color:#71717a;">No words saved in this category yet.</span>`
                  : wordsInCat
                      .map((word) => {
                        const isChecked = selectedWords.has(word);
                        return `
                        <div class="vs-word-badge ${isChecked ? 'checked' : ''}" data-word="${escapeHtml(word)}">
                          <span>${isChecked ? '✓' : '+'}</span>
                          <span>${escapeHtml(word)}</span>
                        </div>
                      `;
                      })
                      .join('')
              }
            </div>
          </div>

          <div>
            <label class="vs-label">Prompt Style</label>
            <div class="vs-mode-row">
              <button class="vs-mode-btn ${currentPromptMode === 'rephrase' ? 'active' : ''}" data-mode="rephrase">
                ✨ Rephrase with Words
              </button>
              <button class="vs-mode-btn ${currentPromptMode === 'draft' ? 'active' : ''}" data-mode="draft">
                📝 Draft New Text
              </button>
              <button class="vs-mode-btn ${currentPromptMode === 'list' ? 'active' : ''}" data-mode="list">
                📋 Insert Words Only
              </button>
              <button class="vs-mode-btn ${currentPromptMode === 'custom' ? 'active' : ''}" data-mode="custom">
                ✏️ Custom Template
              </button>
            </div>
          </div>

          <div>
            <label class="vs-label">Prompt Preview (Injects into Chat)</label>
            <textarea class="vs-prompt-preview" id="vs-prompt-editor">${escapeHtml(promptPreviewText)}</textarea>
          </div>
        </div>

        <div class="vs-ai-footer">
          <span class="vs-ai-status">${selectedWords.size} words selected</span>
          <button class="vs-inject-btn" id="vs-inject-chat-btn">
            <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            Insert into Chat
          </button>
        </div>
      `;
    }

    function attachEvents() {
      drawer.querySelector('#vs-ai-close').addEventListener('click', toggleAiDrawer);

      drawer.querySelectorAll('.vs-cat-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          selectedCategory = chip.getAttribute('data-cat');
          selectedWords = new Set(wordsByCategory[selectedCategory] || []);
          refreshDrawer();
        });
      });

      drawer.querySelectorAll('.vs-word-badge').forEach((badge) => {
        badge.addEventListener('click', () => {
          const w = badge.getAttribute('data-word');
          if (selectedWords.has(w)) {
            selectedWords.delete(w);
          } else {
            selectedWords.add(w);
          }
          refreshDrawer();
        });
      });

      const toggleAll = drawer.querySelector('#vs-toggle-all-words');
      if (toggleAll) {
        toggleAll.addEventListener('click', () => {
          const wordsInCat = wordsByCategory[selectedCategory] || [];
          if (selectedWords.size === wordsInCat.length) {
            selectedWords.clear();
          } else {
            selectedWords = new Set(wordsInCat);
          }
          refreshDrawer();
        });
      }

      drawer.querySelectorAll('.vs-mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentPromptMode = btn.getAttribute('data-mode');
          refreshDrawer();
        });
      });

      drawer.querySelector('#vs-inject-chat-btn').addEventListener('click', () => {
        const customPrompt = drawer.querySelector('#vs-prompt-editor').value;
        injectPromptIntoActiveChat(customPrompt);
      });
    }

    function refreshDrawer() {
      drawer.innerHTML = buildDrawerHtml();
      attachEvents();
    }

    drawer.innerHTML = buildDrawerHtml();
    attachEvents();
    aiDockShadowRoot.appendChild(drawer);
  }

  // --- Smart Chat Input Injector ---
  function findChatInputElement() {
    let el = document.querySelector('#prompt-textarea');
    if (el) return el;

    el = document.querySelector('.ProseMirror[contenteditable="true"]');
    if (el) return el;

    el = document.querySelector('rich-textarea div[contenteditable="true"]') ||
         document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (el) return el;

    el = document.querySelector('textarea[placeholder*="Ask"]') ||
         document.querySelector('textarea[placeholder*="Search"]');
    if (el) return el;

    if (
      document.activeElement &&
      (document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable ||
        (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text'))
    ) {
      return document.activeElement;
    }

    const candidates = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea'));
    for (const cand of candidates) {
      const rect = cand.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 20 && window.getComputedStyle(cand).display !== 'none') {
        return cand;
      }
    }

    return null;
  }

  function getExistingTextFromElement(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    if (el.isContentEditable) {
      return el.innerText || el.textContent || '';
    }
    return '';
  }

  function injectPromptIntoActiveChat(promptText) {
    const targetEl = findChatInputElement();

    if (!targetEl) {
      showToast('Could not detect active chat input. Please click into the chat box first!', '⚠️');
      return;
    }

    const existing = getExistingTextFromElement(targetEl).trim();
    let finalPrompt = promptText;

    if (existing && finalPrompt.includes('[Your text here or current chat prompt]')) {
      finalPrompt = finalPrompt.replace('[Your text here or current chat prompt]', existing);
    } else if (existing && finalPrompt.includes('{text}')) {
      finalPrompt = finalPrompt.replace('{text}', existing);
    }

    targetEl.focus();

    let injectedSuccessfully = false;

    try {
      document.execCommand('selectAll', false, null);
      injectedSuccessfully = document.execCommand('insertText', false, finalPrompt);
    } catch (e) {
      injectedSuccessfully = false;
    }

    if (!injectedSuccessfully) {
      if (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT') {
        const proto = Object.getPrototypeOf(targetEl);
        const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (valueSetter) {
          valueSetter.call(targetEl, finalPrompt);
        } else {
          targetEl.value = finalPrompt;
        }
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        injectedSuccessfully = true;
      } else if (targetEl.isContentEditable) {
        targetEl.innerText = finalPrompt;
        targetEl.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: finalPrompt
          })
        );
        injectedSuccessfully = true;
      }
    }

    targetEl.focus();
    toggleAiDrawer();
    showToast('Vocabulary prompt injected into chat!', '🚀');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Listeners & Event Management ---

  function onUserSelectionTrigger(e) {
    const path = e.composedPath ? e.composedPath() : [];
    if (
      (selectionHost && path.includes(selectionHost)) ||
      (aiDockHost && path.includes(aiDockHost))
    ) {
      return;
    }
    setTimeout(handleSelectionChange, 20);
  }

  // Use CAPTURE phase so no website (or extension) can swallow selection events
  document.addEventListener('mouseup', onUserSelectionTrigger, true);
  document.addEventListener('dblclick', onUserSelectionTrigger, true);

  // Native debounced selectionchange catches all selections
  let selDebounceTimer = null;
  document.addEventListener('selectionchange', () => {
    if (isDialogOpen) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      clearSelectionUi();
      return;
    }
    clearTimeout(selDebounceTimer);
    selDebounceTimer = setTimeout(handleSelectionChange, 100);
  });

  document.addEventListener('keyup', (e) => {
    if (['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      setTimeout(handleSelectionChange, 20);
    }
  }, true);

  // Dismiss tooltip pill when user scrolls above or down, or resizes window
  function onViewportScrollOrMove() {
    lastScrollTime = Date.now();
    if (isDialogOpen || !selectionHost) return;

    // Grace period of 100ms after pill shown to prevent any subpixel/render jitter dismissal
    if (Date.now() - pillShownAt < 100) return;

    const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const currentX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const diffY = Math.abs(currentY - pillOriginScrollY);
    const diffX = Math.abs(currentX - pillOriginScrollX);

    let textMoved = false;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const curRect = sel.getRangeAt(0).getBoundingClientRect();
        if (Math.abs(curRect.top - pillOriginRectTop) > 10) {
          textMoved = true;
        }
      }
    } catch (err) {}

    // Only dismiss if the screen has genuinely moved up or down (threshold 10px)
    if (diffY > 10 || diffX > 10 || textMoved) {
      clearSelectionUi();
    }
  }

  window.addEventListener('scroll', onViewportScrollOrMove, { passive: true, capture: true });
  window.addEventListener('resize', onViewportScrollOrMove, { passive: true });

  // Dismiss pill when clicking outside
  document.addEventListener('mousedown', (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    if (selectionHost && !path.includes(selectionHost)) {
      clearSelectionUi();
    }
  }, true);

  // Background message listener (single listener in top frame)
  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === 'SHOW_TOAST') {
      showToast(req.message);
    } else if (req.action === 'OPEN_SAVE_DIALOG') {
      openQuickSaveDialog(req.text);
    }
  });

  // Initialize AI chat dock
  if (isAiDomain) {
    initAiChatWidget();
  }

  // Global hotkey: Alt+V
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault();
      if (!aiDockHost) {
        initAiChatWidget();
      }
      toggleAiDrawer();
    }
  });
})();
