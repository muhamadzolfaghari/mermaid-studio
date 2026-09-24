/**
 * Code editor component for Mermaid Studio
 * Provides a monospaced textarea with synchronized line numbers,
 * tab indentation, line/char counters, and debounced input events.
 */

export class EditorController {
  constructor(options) {
    this.textarea = options.textarea;
    this.lineNumbersEl = options.lineNumbersEl;
    this.statusDot = options.statusDot;
    this.statusText = options.statusText;
    this.statsEl = options.statsEl;
    this.onChange = options.onChange || (() => {});

    this.debounceTimer = null;
    this.history = [];
    this.historyIndex = -1;

    this.init();
  }

  init() {
    this.updateLineNumbers();
    this.updateStats();

    // Sync scroll
    this.textarea.addEventListener('scroll', () => {
      this.lineNumbersEl.scrollTop = this.textarea.scrollTop;
    });

    // Input events
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      this.updateStats();
      this.handleInputDebounced();
    });

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
    }, 220);
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(code) {
    this.textarea.value = code;
    this.updateLineNumbers();
    this.updateStats();
    this.onChange(code);
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
    if (this.statsEl) {
      this.statsEl.textContent = `Lines: ${lines} | Chars: ${chars}`;
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
