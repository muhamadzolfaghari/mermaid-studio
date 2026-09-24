/**
 * Code editor component for Mermaid Studio
 * Provides a monospaced textarea with synchronized line numbers,
 * tab indentation, line/col tracking, snippet insertion, code formatting, and debounced input events.
 */

export class EditorController {
  constructor(options) {
    this.textarea = options.textarea;
    this.lineNumbersEl = options.lineNumbersEl;
    this.statusDot = options.statusDot;
    this.statusText = options.statusText;
    this.statsEl = options.statsEl;
    this.typeBadgeEl = options.typeBadgeEl;
    this.onChange = options.onChange || (() => {});

    this.debounceTimer = null;
    this.history = [];
    this.historyIndex = -1;

    this.init();
  }

  init() {
    this.updateLineNumbers();
    this.updateStats();
    this.updateTypeBadge();

    // Sync scroll
    this.textarea.addEventListener('scroll', () => {
      this.lineNumbersEl.scrollTop = this.textarea.scrollTop;
    });

    // Input events
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      this.updateStats();
      this.updateTypeBadge();
      this.handleInputDebounced();
    });

    // Cursor position tracking
    const updateCursor = () => this.updateStats();
    this.textarea.addEventListener('click', updateCursor);
    this.textarea.addEventListener('keyup', updateCursor);

    // Key handling (Tab indentation & shortcuts)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const val = this.textarea.value;

        if (e.shiftKey) {
          // Unindent
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          if (val.slice(lineStart, lineStart + 2) === '  ') {
            this.textarea.value = val.slice(0, lineStart) + val.slice(lineStart + 2);
            this.textarea.selectionStart = Math.max(lineStart, start - 2);
            this.textarea.selectionEnd = Math.max(lineStart, end - 2);
          }
        } else {
          // Indent 2 spaces
          this.textarea.value = val.substring(0, start) + '  ' + val.substring(end);
          this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        }

        this.updateLineNumbers();
        this.updateStats();
        this.handleInputDebounced();
      }
    });
  }

  handleInputDebounced() {
    if (this.statusDot) {
      this.statusDot.className = 'status-dot rendering';
    }
    if (this.statusText) {
      this.statusText.textContent = 'Editing…';
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.onChange(this.getValue());
    }, 200);
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(code) {
    this.textarea.value = code;
    this.updateLineNumbers();
    this.updateStats();
    this.updateTypeBadge();
    this.onChange(code);
  }

  insertSnippet(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const val = this.textarea.value;

    this.textarea.value = val.substring(0, start) + text + val.substring(end);
    this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
    this.textarea.focus();

    this.updateLineNumbers();
    this.updateStats();
    this.handleInputDebounced();
  }

  formatCode() {
    const raw = this.textarea.value;
    const lines = raw.split('\n');
    let indentLevel = 0;
    const formatted = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        // Keep single blank line max
        if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
          formatted.push('');
        }
        continue;
      }

      // Check closing subgraphs / blocks
      if (trimmed.startsWith('end')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indent = '  '.repeat(indentLevel);
      formatted.push(`${indent}${trimmed}`);

      // Check opening subgraphs / blocks
      if (trimmed.startsWith('subgraph ') || trimmed.startsWith('rect ') || trimmed.startsWith('opt ') || trimmed.startsWith('loop ')) {
        indentLevel++;
      }
    }

    this.setValue(formatted.join('\n'));
  }

  updateTypeBadge() {
    if (!this.typeBadgeEl) return;
    const code = this.textarea.value;
    const clean = code.replace(/---[\s\S]*?---/, '').trim();
    const firstLine = clean.split('\n')[0] || '';

    let type = 'Diagram';
    if (/^flowchart/i.test(firstLine)) type = 'Flowchart';
    else if (/^graph/i.test(firstLine)) type = 'Graph';
    else if (/^sequenceDiagram/i.test(firstLine)) type = 'Sequence';
    else if (/^classDiagram/i.test(firstLine)) type = 'Class Diagram';
    else if (/^stateDiagram/i.test(firstLine)) type = 'State Machine';
    else if (/^erDiagram/i.test(firstLine)) type = 'ER Schema';
    else if (/^gitGraph/i.test(firstLine)) type = 'Git Graph';
    else if (/^gantt/i.test(firstLine)) type = 'Gantt';
    else if (/^mindmap/i.test(firstLine)) type = 'Mindmap';
    else if (/^pie/i.test(firstLine)) type = 'Pie Chart';
    else if (/^architecture/i.test(firstLine)) type = 'Architecture';

    this.typeBadgeEl.textContent = type;
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += `${i}\n`;
    }
    this.lineNumbersEl.textContent = numbers;
  }

  updateStats() {
    const code = this.textarea.value;
    const lines = code.split('\n').length;
    const chars = code.length;

    // Calculate cursor position
    const pos = this.textarea.selectionStart || 0;
    const textBefore = code.substring(0, pos);
    const lineIndex = textBefore.split('\n').length;
    const colIndex = pos - textBefore.lastIndexOf('\n');

    if (this.statsEl) {
      this.statsEl.textContent = `Ln ${lineIndex}, Col ${colIndex} | ${lines} lines, ${chars} chars`;
    }
  }

  setStatus(state, message) {
    if (this.statusDot) {
      this.statusDot.className = `status-dot ${state}`;
    }
    if (this.statusText) {
      this.statusText.textContent = message;
    }
  }
}
