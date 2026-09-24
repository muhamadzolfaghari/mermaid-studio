import { DIAGRAM_TEMPLATES, getTemplateById } from './components/templates.js';
import { CanvasController } from './components/canvas.js';
import { EditorController } from './components/editor.js';
import { StorageManager } from './components/storage.js';
import { Exporter } from './components/exporter.js';
import { initMermaid, renderMermaid, setMermaidTheme } from './utils/mermaid-renderer.js';

// DOM Elements
const $ = (id) => document.getElementById(id);

const stageEl = $('stage');
const canvasEl = $('canvas');
const diagramContainer = $('diagram-container');
const zoomLabelEl = $('zoomLabel');
const wheelToggleBtn = $('wheelToggleBtn');
const fullscreenBtn = $('fullscreenBtn');

const codeEditorEl = $('codeEditor');
const lineNumbersEl = $('lineNumbers');
const statusDotEl = $('statusDot');
const statusTextEl = $('statusText');
const editorStatsEl = $('editorStats');

const templateSelectEl = $('templateSelect');
const themeSelectEl = $('themeSelect');
const gridSelectEl = $('gridSelect');
const canvasAlertEl = $('canvasAlert');
const alertMessageEl = $('alertMessage');
const alertCloseBtn = $('alertCloseBtn');

const splitterEl = $('splitter');
const editorPaneEl = $('editorPane');
const canvasPaneEl = $('canvasPane');
const mobileTabsEl = $('mobileTabs');

// Modals & Menus
const exportMenuBtn = $('exportMenuBtn');
const exportDropdown = $('exportDropdown');
const savedModal = $('savedModal');
const shortcutsModal = $('shortcutsModal');
const restoreModal = $('restoreModal');
const fileInput = $('fileInput');

// State
let activeTemplateId = 'dependency-overview';
let activeDiagramTitle = 'Dependency Tree — Overview';
let canvasCtrl;
let editorCtrl;

// Initialize Application
async function initApp() {
  // 1. Initialize Theme & Storage
  const savedTheme = StorageManager.getTheme();
  themeSelectEl.value = savedTheme;
  initMermaid(savedTheme);

  const savedGrid = StorageManager.getGridStyle();
  gridSelectEl.value = savedGrid;
  applyGridStyle(savedGrid);

  // 2. Initialize Canvas
  canvasCtrl = new CanvasController({
    stage: stageEl,
    canvas: canvasEl,
    container: diagramContainer,
    zoomLabel: zoomLabelEl,
    wheelToggleBtn: wheelToggleBtn,
    fullscreenBtn: fullscreenBtn,
  });

  // 3. Initialize Editor
  editorCtrl = new EditorController({
    textarea: codeEditorEl,
    lineNumbersEl: lineNumbersEl,
    statusDot: statusDotEl,
    statusText: statusTextEl,
    statsEl: editorStatsEl,
    onChange: handleCodeChange,
  });

  // 4. Setup Templates Dropdown
  setupTemplatesDropdown();

  // 5. Load Initial Source
  const storedDraft = StorageManager.getDraft();
  const storedTplId = StorageManager.getActiveTemplateId();
  if (storedTplId && getTemplateById(storedTplId)) {
    activeTemplateId = storedTplId;
    templateSelectEl.value = storedTplId;
    activeDiagramTitle = getTemplateById(storedTplId).title;
  }

  if (storedDraft) {
    editorCtrl.setValue(storedDraft);
  } else {
    loadTemplate(activeTemplateId, false);
  }

  // 6. Bind All Event Listeners
  bindUIEvents();
  setupSplitter();
  setupMobileTabs();
}

// Template Handling
function setupTemplatesDropdown() {
  templateSelectEl.innerHTML = '';
  const categories = {};

  DIAGRAM_TEMPLATES.forEach((tpl) => {
    if (!categories[tpl.category]) {
      categories[tpl.category] = [];
    }
    categories[tpl.category].push(tpl);
  });

  Object.entries(categories).forEach(([categoryName, items]) => {
    const group = document.createElement('optgroup');
    group.label = categoryName;
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.title} (${item.kind})`;
      group.appendChild(opt);
    });
    templateSelectEl.appendChild(group);
  });

  templateSelectEl.addEventListener('change', (e) => {
    loadTemplate(e.target.value, true);
  });
}

function loadTemplate(templateId, shouldFit = true) {
  const tpl = getTemplateById(templateId);
  activeTemplateId = tpl.id;
  activeDiagramTitle = tpl.title;
  templateSelectEl.value = tpl.id;
  editorCtrl.setValue(tpl.code);
  StorageManager.saveDraft(tpl.code, tpl.id);

  if (shouldFit) {
    setTimeout(() => {
      canvasCtrl.fit(true);
    }, 100);
  }
}

// Rendering & Error Management
async function handleCodeChange(code) {
  if (!code || !code.trim()) {
    editorCtrl.setStatus('rendering', 'Empty editor');
    return;
  }

  editorCtrl.setStatus('rendering', 'Rendering…');
  const result = await renderMermaid(diagramContainer, code);

  if (result.aborted) return;

  if (result.success) {
    hideAlert();
    editorCtrl.setStatus('', 'Rendered');
    StorageManager.saveDraft(code, activeTemplateId);
    canvasCtrl.measure();
  } else {
    showAlert(result.error);
    editorCtrl.setStatus('error', 'Syntax error');
    // Notice: Previous valid diagram remains displayed on canvas!
  }
}

function showAlert(msg) {
  alertMessageEl.textContent = msg;
  canvasAlertEl.className = 'canvas-alert error show';
}

function hideAlert() {
  canvasAlertEl.className = 'canvas-alert error';
}

// Visual Options
function applyGridStyle(style) {
  stageEl.classList.remove('grid-lines', 'grid-none');
  if (style === 'lines') stageEl.classList.add('grid-lines');
  else if (style === 'none') stageEl.classList.add('grid-none');
}

// UI Event Bindings
function bindUIEvents() {
  // Canvas HUD buttons
  $('zoomIn').addEventListener('click', () => canvasCtrl.setZoom(canvasCtrl.zoom * 1.2));
  $('zoomOut').addEventListener('click', () => canvasCtrl.setZoom(canvasCtrl.zoom / 1.2));
  $('fitBtn').addEventListener('click', () => canvasCtrl.fit(true));
  $('recenterBtn').addEventListener('click', () => canvasCtrl.center(true));
  $('resetBtn').addEventListener('click', () => canvasCtrl.reset(true));
  wheelToggleBtn.addEventListener('click', () => canvasCtrl.toggleWheelMode());
  fullscreenBtn.addEventListener('click', () => canvasCtrl.toggleFullscreen());

  // Themes & Grid
  themeSelectEl.addEventListener('change', (e) => {
    const theme = e.target.value;
    StorageManager.setTheme(theme);
    setMermaidTheme(theme);
    handleCodeChange(editorCtrl.getValue());
  });

  gridSelectEl.addEventListener('change', (e) => {
    const grid = e.target.value;
    StorageManager.setGridStyle(grid);
    applyGridStyle(grid);
  });

  alertCloseBtn.addEventListener('click', hideAlert);

  // Editor Actions
  $('restoreTemplateBtn').addEventListener('click', () => {
    openModal('restoreModal');
  });

  $('confirmRestoreBtn').addEventListener('click', () => {
    closeModal('restoreModal');
    loadTemplate(activeTemplateId, true);
  });

  $('clearEditorBtn').addEventListener('click', () => {
    editorCtrl.setValue('');
  });

  // Export Menu
  exportMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.style.display = exportDropdown.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!exportDropdown.contains(e.target) && e.target !== exportMenuBtn) {
      exportDropdown.style.display = 'none';
    }
  });

  $('exportSvgBtn').addEventListener('click', () => {
    try {
      Exporter.downloadSvg(diagramContainer, activeDiagramTitle);
      exportDropdown.style.display = 'none';
    } catch (err) {
      showAlert(err.message);
    }
  });

  $('exportPngBtn').addEventListener('click', async () => {
    try {
      editorCtrl.setStatus('rendering', 'Exporting PNG…');
      await Exporter.downloadPng(diagramContainer, activeDiagramTitle, 2);
      editorCtrl.setStatus('', 'Rendered');
      exportDropdown.style.display = 'none';
    } catch (err) {
      editorCtrl.setStatus('error', 'Export error');
      showAlert(err.message);
    }
  });

  $('downloadMmdBtn').addEventListener('click', () => {
    Exporter.downloadSource(editorCtrl.getValue(), activeDiagramTitle);
    exportDropdown.style.display = 'none';
  });

  $('copySvgBtn').addEventListener('click', async () => {
    try {
      await Exporter.copySvg(diagramContainer);
      exportDropdown.style.display = 'none';
      editorCtrl.setStatus('', 'SVG copied to clipboard!');
      setTimeout(() => editorCtrl.setStatus('', 'Rendered'), 2000);
    } catch (err) {
      showAlert(err.message);
    }
  });

  $('copyMdBtn').addEventListener('click', async () => {
    try {
      await Exporter.copyMarkdown(editorCtrl.getValue());
      exportDropdown.style.display = 'none';
      editorCtrl.setStatus('', 'Markdown copied to clipboard!');
      setTimeout(() => editorCtrl.setStatus('', 'Rendered'), 2000);
    } catch (err) {
      showAlert(err.message);
    }
  });

  // Import File
  $('importBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileImport);

  // Drag and drop onto editor
  editorPaneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  editorPaneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      readImportedFile(e.dataTransfer.files[0]);
    }
  });

  // Saved Diagrams
  $('savedDiagramsBtn').addEventListener('click', () => {
    refreshSavedList();
    openModal('savedModal');
  });

  $('saveDraftBtn').addEventListener('click', () => {
    $('newDiagramTitle').value = activeDiagramTitle;
    refreshSavedList();
    openModal('savedModal');
  });

  $('modalSaveBtn').addEventListener('click', () => {
    const title = $('newDiagramTitle').value.trim() || 'Untitled Diagram';
    StorageManager.saveDiagram(title, editorCtrl.getValue());
    activeDiagramTitle = title;
    refreshSavedList();
  });

  // Shortcuts Modal
  $('shortcutsBtn').addEventListener('click', () => openModal('shortcutsModal'));

  // Close modals on [data-close] or backdrop click
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.close);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Keyboard Shortcuts for Save, Open, Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      $('newDiagramTitle').value = activeDiagramTitle;
      refreshSavedList();
      openModal('savedModal');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      fileInput.click();
    } else if (e.key === '?' && !e.target.matches('input,textarea')) {
      e.preventDefault();
      openModal('shortcutsModal');
    }
  });
}

function handleFileImport(e) {
  const file = e.target.files?.[0];
  if (file) {
    readImportedFile(file);
    fileInput.value = '';
  }
}

function readImportedFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const code = event.target.result;
    activeDiagramTitle = file.name.replace(/\.[^/.]+$/, '');
    editorCtrl.setValue(code);
    setTimeout(() => canvasCtrl.fit(true), 120);
  };
  reader.readAsText(file);
}

function refreshSavedList() {
  const container = $('savedListContainer');
  const diagrams = StorageManager.getSavedDiagrams();
  container.innerHTML = '';

  if (diagrams.length === 0) {
    container.innerHTML = `<div class="diagram-empty-state">No saved diagrams yet. Save your current diagram above!</div>`;
    return;
  }

  diagrams.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'diagram-item';

    const info = document.createElement('div');
    info.className = 'diagram-item-info';
    info.innerHTML = `
      <div class="diagram-item-name">${escapeHtml(item.title)}</div>
      <div class="diagram-item-date">${new Date(item.updatedAt).toLocaleString()}</div>
    `;
    info.addEventListener('click', () => {
      activeDiagramTitle = item.title;
      editorCtrl.setValue(item.code);
      closeModal('savedModal');
      setTimeout(() => canvasCtrl.fit(true), 100);
    });

    const actions = document.createElement('div');
    actions.className = 'diagram-item-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'editor-tool-btn';
    deleteBtn.title = 'Delete saved diagram';
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      StorageManager.deleteDiagram(item.id);
      refreshSavedList();
    });

    actions.appendChild(deleteBtn);
    row.appendChild(info);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

// Splitter Dragging
function setupSplitter() {
  let isDraggingSplitter = false;

  splitterEl.addEventListener('pointerdown', (e) => {
    isDraggingSplitter = true;
    splitterEl.classList.add('dragging');
    splitterEl.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingSplitter) return;
    const newWidth = Math.max(260, Math.min(window.innerWidth * 0.75, e.clientX));
    document.documentElement.style.setProperty('--editor-width', `${newWidth}px`);
  });

  const stopSplitter = (e) => {
    if (isDraggingSplitter) {
      isDraggingSplitter = false;
      splitterEl.classList.remove('dragging');
      if (splitterEl.hasPointerCapture(e.pointerId)) {
        splitterEl.releasePointerCapture(e.pointerId);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      canvasCtrl.applyTransform();
    }
  };

  window.addEventListener('pointerup', stopSplitter);
  window.addEventListener('pointercancel', stopSplitter);
}

// Mobile Tab Switcher
function setupMobileTabs() {
  const tabs = mobileTabsEl.querySelectorAll('.mobile-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;

      if (target === 'editor') {
        editorPaneEl.classList.remove('tab-hidden');
        canvasPaneEl.classList.add('tab-hidden');
      } else {
        editorPaneEl.classList.add('tab-hidden');
        canvasPaneEl.classList.remove('tab-hidden');
        setTimeout(() => canvasCtrl.fit(false), 50);
      }
    });
  });
}

// Modal Helpers
function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove('open');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
