import { DIAGRAM_TEMPLATES, getTemplateById } from './components/templates.js';
import { CanvasController } from './components/canvas.js';
import { EditorController } from './components/editor.js';
import { StorageManager } from './components/storage.js';
import { Exporter } from './components/exporter.js';
import { AIAssistant } from './components/ai-assistant.js';
import { MiniMapController } from './components/minimap.js';
import { initMermaid, renderMermaid, setMermaidTheme } from './utils/mermaid-renderer.js';
import {
  buttonVariants,
  badgeVariants,
  cardVariants,
  inputVariants,
  createButton,
  createBadge,
  cn,
} from './components/ui/index.js';

// DOM Elements
const $ = (id) => document.getElementById(id);

const stageEl = $('stage');
const canvasEl = $('canvas');
const diagramContainer = $('diagram-container');
const zoomLabelEl = $('zoomLabel');
const fullscreenBtn = $('fullscreenBtn');

const codeEditorEl = $('codeEditor');
const lineNumbersEl = $('lineNumbers');
const statusDotEl = $('statusDot');
const statusTextEl = $('statusText');
const editorStatsEl = $('editorStats');
const diagramTypeBadgeEl = $('diagramTypeBadge');

const diagramTitleInput = $('diagramTitleInput');
const versionTag = $('versionTag');
const savedDotEl = $('savedDot');
const savedLabelEl = $('savedLabel');

const themeSelectEl = $('themeSelect');
const canvasAlertEl = $('canvasAlert');
const alertMessageEl = $('alertMessage');
const alertCloseBtn = $('alertCloseBtn');

const splitterEl = $('splitter');
const editorPaneEl = $('editorPane');
const canvasPaneEl = $('canvasPane');
const mobileTabsEl = $('mobileTabs');

// Sidebar Drawer & Rail
const sidebarDrawer = $('sidebarDrawer');
const aiDrawerContainer = $('aiDrawerContainer');
const templatesDrawerContainer = $('templatesDrawerContainer');
const savedDrawerContainer = $('savedDrawerContainer');

const railFilesBtn = $('railFilesBtn');
const railTemplatesBtn = $('railTemplatesBtn');
const railAiBtn = $('railAiBtn');
const railShortcutsBtn = $('railShortcutsBtn');
const railImportBtn = $('railImportBtn');
const openAiDrawerBtn = $('openAiDrawerBtn');

// Modals & Menus
const exportMenuBtn = $('exportMenuBtn');
const exportDropdown = $('exportDropdown');
const savedModal = $('savedModal');
const shortcutsModal = $('shortcutsModal');
const restoreModal = $('restoreModal');
const versionModal = $('versionModal');
const fileInput = $('fileInput');

// User Profile Popover
const userAvatarBtn = $('userAvatarBtn');
const userProfilePopover = $('userProfilePopover');

// Canvas Dock
const panToolBtn = $('panToolBtn');
const selectToolBtn = $('selectToolBtn');
const minimapToggleBtn = $('minimapToggleBtn');
const gridToggleBtn = $('gridToggleBtn');
const minimapContainer = $('minimapContainer');

// Node Inspector HUD
const nodeInspectorHud = $('nodeInspectorHud');
const nodeHudLabel = $('nodeHudLabel');
const nodeHudLocateBtn = $('nodeHudLocateBtn');
const nodeHudCloseBtn = $('nodeHudCloseBtn');

// State
let activeTemplateId = 'dependency-overview';
let activeDiagramTitle = 'Dependency Tree — Overview';
let canvasCtrl;
let editorCtrl;
let minimapCtrl;
let aiAssistant;
let currentGridStyle = 'dots';
let activeDrawer = null; // 'ai' | 'templates' | 'saved' | null
let viewMode = 'split'; // 'split' | 'canvas' | 'editor'
let currentToolMode = 'pan'; // 'pan' | 'select'
let selectedNodeEl = null;

let currentTemplateFilter = 'all';
let currentTemplateQuery = '';

// Initialize Application
async function initApp() {
  // 1. Initialize Theme & Storage
  const savedTheme = StorageManager.getTheme();
  if (themeSelectEl) themeSelectEl.value = savedTheme;
  initMermaid(savedTheme);

  currentGridStyle = StorageManager.getGridStyle() || 'dots';
  applyGridStyle(currentGridStyle);

  // 2. Initialize Canvas
  canvasCtrl = new CanvasController({
    stage: stageEl,
    canvas: canvasEl,
    container: diagramContainer,
    zoomLabel: zoomLabelEl,
    fullscreenBtn: fullscreenBtn,
  });

  // 3. Initialize MiniMap
  minimapCtrl = new MiniMapController({
    container: minimapContainer,
    canvasCtrl: canvasCtrl,
    diagramContainer: diagramContainer,
    stage: stageEl,
  });

  // Hook canvas changes into minimap rect update
  const origApply = canvasCtrl.applyTransform.bind(canvasCtrl);
  canvasCtrl.applyTransform = function () {
    origApply();
    if (minimapCtrl) minimapCtrl.updateRect();
  };

  // 4. Initialize Editor
  editorCtrl = new EditorController({
    textarea: codeEditorEl,
    lineNumbersEl: lineNumbersEl,
    statusDot: statusDotEl,
    statusText: statusTextEl,
    statsEl: editorStatsEl,
    typeBadgeEl: diagramTypeBadgeEl,
    onChange: handleCodeChange,
  });

  // 5. Initialize Mermaid AI Assistant
  aiAssistant = new AIAssistant({
    container: aiDrawerContainer,
    onApplyCode: (newCode, promptTitle) => {
      editorCtrl.setValue(newCode);
      if (promptTitle) {
        activeDiagramTitle = promptTitle;
        if (diagramTitleInput) diagramTitleInput.value = promptTitle;
      }
      closeSidebarDrawer();
      setTimeout(() => canvasCtrl.fit(true), 150);
    },
    onInsertCode: (snippet) => {
      editorCtrl.insertSnippet(snippet);
      closeSidebarDrawer();
    },
  });

  // 6. Setup Templates Gallery Drawer
  setupTemplatesDrawer();

  // 7. Load Initial Source
  const storedDraft = StorageManager.getDraft();
  const storedTplId = StorageManager.getActiveTemplateId();
  if (storedTplId && getTemplateById(storedTplId)) {
    activeTemplateId = storedTplId;
    activeDiagramTitle = getTemplateById(storedTplId).title;
  }
  if (diagramTitleInput) {
    diagramTitleInput.value = activeDiagramTitle;
  }

  if (storedDraft) {
    editorCtrl.setValue(storedDraft);
  } else {
    loadTemplate(activeTemplateId, false);
  }

  // 8. Setup Subsystems
  setupNodeInspector();
  setupVersionHistory();
  setupUserProfile();

  // 9. Bind UI Events & Interactions
  bindUIEvents();
  setupSplitter();
  setupMobileTabs();

  // Initial minimap sync
  setTimeout(() => {
    if (minimapCtrl) minimapCtrl.update();
  }, 300);
}

// Template Handling & Filter
function setupTemplatesDrawer() {
  renderTemplatesList();

  const searchInput = $('templatesSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentTemplateQuery = e.target.value.toLowerCase().trim();
      renderTemplatesList();
    });
  }

  const chips = document.querySelectorAll('.tpl-filter-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentTemplateFilter = chip.dataset.filter;
      renderTemplatesList();
    });
  });
}

function renderTemplatesList() {
  const container = $('templatesList');
  if (!container) return;
  container.innerHTML = '';

  const filtered = DIAGRAM_TEMPLATES.filter((tpl) => {
    const matchesFilter = currentTemplateFilter === 'all' || tpl.category.toLowerCase().includes(currentTemplateFilter.toLowerCase());
    const matchesQuery = !currentTemplateQuery || 
      tpl.title.toLowerCase().includes(currentTemplateQuery) || 
      tpl.description.toLowerCase().includes(currentTemplateQuery) || 
      tpl.kind.toLowerCase().includes(currentTemplateQuery);
    return matchesFilter && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="diagram-empty-state">No templates match your search.</div>';
    return;
  }

  const categories = {};
  filtered.forEach((tpl) => {
    if (!categories[tpl.category]) {
      categories[tpl.category] = [];
    }
    categories[tpl.category].push(tpl);
  });

  Object.entries(categories).forEach(([categoryName, items]) => {
    const catHeader = document.createElement('div');
    catHeader.style.cssText = 'font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin: 12px 0 6px 0; letter-spacing: 0.05em;';
    catHeader.textContent = categoryName;
    container.appendChild(catHeader);

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = cn(cardVariants({ variant: 'interactive', padding: 'sm' }), 'diagram-item');
      card.style.cursor = 'pointer';
      const kindBadgeClass = badgeVariants({ variant: 'ai', size: 'sm' });
      card.innerHTML = `
        <div class="diagram-item-info">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="${kindBadgeClass}">${item.kind}</span>
            <span class="diagram-item-name font-medium text-foreground">${escapeHtml(item.title)}</span>
          </div>
          <div class="diagram-item-date" style="margin-top: 4px;">${escapeHtml(item.description)}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        loadTemplate(item.id, true);
        closeSidebarDrawer();
      });
      container.appendChild(card);
    });
  });
}

function loadTemplate(templateId, shouldFit = true) {
  const tpl = getTemplateById(templateId);
  activeTemplateId = tpl.id;
  activeDiagramTitle = tpl.title;
  if (diagramTitleInput) {
    diagramTitleInput.value = activeDiagramTitle;
  }
  editorCtrl.setValue(tpl.code);
  StorageManager.saveDraft(tpl.code, tpl.id);

  if (shouldFit) {
    setTimeout(() => {
      canvasCtrl.fit(true);
    }, 120);
  }
}

// Rendering & Error Management
async function handleCodeChange(code) {
  if (!code || !code.trim()) {
    editorCtrl.setStatus('rendering', 'Empty editor');
    setSavedIndicator(true);
    return;
  }

  setSavedIndicator(false);
  editorCtrl.setStatus('rendering', 'Rendering…');
  const startTime = performance.now();
  const result = await renderMermaid(diagramContainer, code);
  const duration = Math.round(performance.now() - startTime);

  if (result.aborted) return;

  if (result.success) {
    hideAlert();
    editorCtrl.setStatus('', `Rendered (${duration}ms)`);
    setSavedIndicator(true);
    StorageManager.saveDraft(code, activeTemplateId);
    canvasCtrl.measure();
    if (minimapCtrl) minimapCtrl.update();
  } else {
    showAlert(result.error);
    editorCtrl.setStatus('error', 'Syntax error');
    setSavedIndicator(true);
  }
}

function setSavedIndicator(isSaved) {
  if (savedDotEl && savedLabelEl) {
    if (isSaved) {
      savedDotEl.className = 'saved-dot';
      savedLabelEl.textContent = 'Saved';
    } else {
      savedDotEl.className = 'saved-dot saving';
      savedLabelEl.textContent = 'Editing…';
    }
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

// Sidebar Drawer Control
function toggleSidebarDrawer(drawerName) {
  if (activeDrawer === drawerName) {
    closeSidebarDrawer();
    return;
  }

  activeDrawer = drawerName;
  sidebarDrawer.classList.add('open');

  // Update rail buttons
  [railFilesBtn, railTemplatesBtn, railAiBtn].forEach((btn) => btn?.classList.remove('active'));

  aiDrawerContainer.style.display = 'none';
  templatesDrawerContainer.style.display = 'none';
  savedDrawerContainer.style.display = 'none';

  if (drawerName === 'ai') {
    aiDrawerContainer.style.display = 'flex';
    railAiBtn?.classList.add('active');
    setTimeout(() => $('aiPromptText')?.focus(), 150);
  } else if (drawerName === 'templates') {
    templatesDrawerContainer.style.display = 'flex';
    railTemplatesBtn?.classList.add('active');
  } else if (drawerName === 'saved') {
    savedDrawerContainer.style.display = 'flex';
    railFilesBtn?.classList.add('active');
    refreshDrawerSavedList();
  }
}

function closeSidebarDrawer() {
  activeDrawer = null;
  sidebarDrawer.classList.remove('open');
  [railFilesBtn, railTemplatesBtn, railAiBtn].forEach((btn) => btn?.classList.remove('active'));
}

// Layout View Switcher
function setViewMode(mode) {
  viewMode = mode;
  $('viewSplitBtn').classList.toggle('active', mode === 'split');
  $('viewCanvasBtn').classList.toggle('active', mode === 'canvas');
  $('viewEditorBtn').classList.toggle('active', mode === 'editor');

  if (mode === 'split') {
    editorPaneEl.style.display = 'flex';
    editorPaneEl.style.width = 'var(--editor-width)';
    canvasPaneEl.style.display = 'flex';
    splitterEl.style.display = 'block';
    setTimeout(() => canvasCtrl.applyTransform(), 50);
  } else if (mode === 'canvas') {
    editorPaneEl.style.display = 'none';
    canvasPaneEl.style.display = 'flex';
    splitterEl.style.display = 'none';
    setTimeout(() => {
      canvasCtrl.applyTransform();
      canvasCtrl.fit(false);
    }, 50);
  } else if (mode === 'editor') {
    editorPaneEl.style.display = 'flex';
    editorPaneEl.style.width = '100%';
    canvasPaneEl.style.display = 'none';
    splitterEl.style.display = 'none';
  }
}

// Interactive Node Inspector (Select Tool)
function setupNodeInspector() {
  panToolBtn.addEventListener('click', () => {
    currentToolMode = 'pan';
    panToolBtn.classList.add('active');
    selectToolBtn.classList.remove('active');
    stageEl.classList.remove('select-mode');
    clearSelectedNode();
  });

  selectToolBtn.addEventListener('click', () => {
    currentToolMode = 'select';
    selectToolBtn.classList.add('active');
    panToolBtn.classList.remove('active');
    stageEl.classList.add('select-mode');
  });

  // Clicking on canvas in select mode
  diagramContainer.addEventListener('click', (e) => {
    if (currentToolMode !== 'select') return;

    const nodeEl = e.target.closest('.node, [class*="node"], .actor');
    if (!nodeEl) {
      clearSelectedNode();
      return;
    }

    e.stopPropagation();
    selectNode(nodeEl);
  });

  nodeHudCloseBtn?.addEventListener('click', clearSelectedNode);

  nodeHudLocateBtn?.addEventListener('click', () => {
    if (!selectedNodeEl) return;
    const label = getNodeText(selectedNodeEl);
    locateTextInEditor(label);
  });
}

function selectNode(nodeEl) {
  clearSelectedNode();
  selectedNodeEl = nodeEl;
  selectedNodeEl.classList.add('selected-node');

  const label = getNodeText(nodeEl);
  if (nodeInspectorHud && nodeHudLabel) {
    nodeHudLabel.textContent = label;
    nodeInspectorHud.style.display = 'flex';
  }
}

function clearSelectedNode() {
  if (selectedNodeEl) {
    selectedNodeEl.classList.remove('selected-node');
    selectedNodeEl = null;
  }
  if (nodeInspectorHud) {
    nodeInspectorHud.style.display = 'none';
  }
}

function getNodeText(nodeEl) {
  const labelEl = nodeEl.querySelector('.nodeLabel, text');
  let text = labelEl ? labelEl.textContent.trim() : nodeEl.textContent.trim();
  if (!text) {
    text = nodeEl.id ? nodeEl.id.replace(/^flowchart-|-[\d]+$/g, '') : 'Node';
  }
  return text;
}

function locateTextInEditor(text) {
  if (!text) return;
  const code = editorCtrl.getValue();
  let idx = code.indexOf(text);
  if (idx === -1) {
    const firstWord = text.split(/[\s\[\(\{]+/)[0];
    if (firstWord) idx = code.indexOf(firstWord);
  }

  if (idx !== -1) {
    // If in canvas-only view, switch to split view so editor is visible
    if (viewMode === 'canvas') {
      setViewMode('split');
    }
    codeEditorEl.focus();
    codeEditorEl.setSelectionRange(idx, idx + text.length);
    const linesBefore = code.substring(0, idx).split('\n').length;
    const lineHeight = 21;
    codeEditorEl.scrollTop = Math.max(0, (linesBefore - 4) * lineHeight);
    editorCtrl.updateStats();
  }
}

// Version History & Snapshots
function setupVersionHistory() {
  versionTag?.addEventListener('click', () => {
    refreshVersionList();
    openModal('versionModal');
  });

  const saveSnapshotBtn = $('saveSnapshotBtn');
  const newSnapshotLabel = $('newSnapshotLabel');

  saveSnapshotBtn?.addEventListener('click', () => {
    const list = StorageManager.getSnapshots();
    const val = newSnapshotLabel.value.trim() || `v0.${list.length + 1}`;
    StorageManager.saveSnapshot(val, activeDiagramTitle, editorCtrl.getValue());
    newSnapshotLabel.value = '';
    versionTag.textContent = val.split(' ')[0];
    refreshVersionList();
    updateProfileStats();
  });
}

function refreshVersionList() {
  const container = $('versionListContainer');
  if (!container) return;
  const list = StorageManager.getSnapshots();
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<div class="diagram-empty-state">No version snapshots saved yet. Create a snapshot above to preserve the current state.</div>';
    return;
  }

  list.forEach((item) => {
    const row = document.createElement('div');
    row.className = cn(cardVariants({ variant: 'interactive', padding: 'sm' }), 'version-item');

    const left = document.createElement('div');
    left.className = 'version-item-left flex items-center gap-3';

    const tagSpan = document.createElement('span');
    tagSpan.className = badgeVariants({ variant: 'outline', size: 'sm' });
    tagSpan.textContent = item.version;

    const info = document.createElement('div');
    info.className = 'version-info';
    info.innerHTML = `
      <span class="version-title font-medium text-foreground">${escapeHtml(item.title)}</span>
      <span class="version-time text-xs text-muted-foreground">${new Date(item.createdAt).toLocaleString()}</span>
    `;

    left.appendChild(tagSpan);
    left.appendChild(info);

    const right = document.createElement('div');
    right.className = 'flex items-center gap-2';

    const restoreBtn = createButton({
      variant: 'default',
      size: 'xs',
      content: 'Restore',
      onClick: () => {
        editorCtrl.setValue(item.code);
        activeDiagramTitle = item.title;
        if (diagramTitleInput) diagramTitleInput.value = item.title;
        if (versionTag) versionTag.textContent = item.version.split(' ')[0];
        closeModal('versionModal');
        setTimeout(() => canvasCtrl.fit(true), 120);
      },
    });

    const deleteBtn = createButton({
      variant: 'ghost',
      size: 'icon-sm',
      className: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
      content: '🗑️',
      attributes: { title: 'Delete snapshot' },
      onClick: () => {
        StorageManager.deleteSnapshot(item.id);
        refreshVersionList();
        updateProfileStats();
      },
    });

    right.appendChild(restoreBtn);
    right.appendChild(deleteBtn);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}

// User Profile Popover
function setupUserProfile() {
  userAvatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = userProfilePopover.style.display === 'flex';
    userProfilePopover.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) updateProfileStats();
  });

  document.addEventListener('click', (e) => {
    if (userProfilePopover && !userProfilePopover.contains(e.target) && e.target !== userAvatarBtn) {
      userProfilePopover.style.display = 'none';
    }
  });

  $('popoverViewSavedBtn')?.addEventListener('click', () => {
    userProfilePopover.style.display = 'none';
    refreshSavedList();
    openModal('savedModal');
  });

  $('popoverShortcutsBtn')?.addEventListener('click', () => {
    userProfilePopover.style.display = 'none';
    openModal('shortcutsModal');
  });

  updateProfileStats();
}

function updateProfileStats() {
  const savedCount = StorageManager.getSavedDiagrams().length;
  const snapshotCount = StorageManager.getSnapshots().length;
  if ($('statSavedCount')) $('statSavedCount').textContent = savedCount;
  if ($('statSnapshotCount')) $('statSnapshotCount').textContent = snapshotCount;
}

// UI Event Bindings
function bindUIEvents() {
  // Breadcrumb Title Rename
  diagramTitleInput.addEventListener('change', () => {
    const val = diagramTitleInput.value.trim() || 'Untitled Diagram';
    activeDiagramTitle = val;
    StorageManager.saveDraft(editorCtrl.getValue(), activeTemplateId);
  });

  // View Switcher Buttons
  $('viewSplitBtn').addEventListener('click', () => setViewMode('split'));
  $('viewCanvasBtn').addEventListener('click', () => setViewMode('canvas'));
  $('viewEditorBtn').addEventListener('click', () => setViewMode('editor'));

  // Left Rail & Drawer Buttons
  railAiBtn.addEventListener('click', () => toggleSidebarDrawer('ai'));
  openAiDrawerBtn.addEventListener('click', () => toggleSidebarDrawer('ai'));
  railTemplatesBtn.addEventListener('click', () => toggleSidebarDrawer('templates'));
  railFilesBtn.addEventListener('click', () => toggleSidebarDrawer('saved'));
  railShortcutsBtn.addEventListener('click', () => openModal('shortcutsModal'));
  railImportBtn.addEventListener('click', () => fileInput.click());

  $('closeAiDrawerBtn')?.addEventListener('click', closeSidebarDrawer);
  $('closeTemplatesDrawerBtn')?.addEventListener('click', closeSidebarDrawer);
  $('closeSavedDrawerBtn')?.addEventListener('click', closeSidebarDrawer);

  $('drawerNewDiagramBtn')?.addEventListener('click', () => {
    activeDiagramTitle = 'New Diagram';
    diagramTitleInput.value = activeDiagramTitle;
    editorCtrl.setValue('flowchart TD\n    Start([Start]) --> Process[Process Task]\n    Process --> Done{{Complete}}');
    closeSidebarDrawer();
    setTimeout(() => canvasCtrl.fit(true), 150);
  });

  // Canvas Dock Island Controls
  $('zoomIn').addEventListener('click', () => canvasCtrl.setZoom(canvasCtrl.zoom * 1.2));
  $('zoomOut').addEventListener('click', () => canvasCtrl.setZoom(canvasCtrl.zoom / 1.2));
  $('zoomLabel').addEventListener('click', () => canvasCtrl.reset(true));
  $('fitBtn').addEventListener('click', () => canvasCtrl.fit(true));
  $('recenterBtn').addEventListener('click', () => canvasCtrl.center(true));
  fullscreenBtn.addEventListener('click', () => canvasCtrl.toggleFullscreen());

  // Minimap Toggle
  minimapToggleBtn.addEventListener('click', () => {
    minimapCtrl.toggle();
    minimapToggleBtn.classList.toggle('active', minimapCtrl.isVisible);
  });

  // Grid Cycle Toggle (Dots -> Lines -> Blank)
  gridToggleBtn.addEventListener('click', () => {
    if (currentGridStyle === 'dots') currentGridStyle = 'lines';
    else if (currentGridStyle === 'lines') currentGridStyle = 'none';
    else currentGridStyle = 'dots';

    StorageManager.setGridStyle(currentGridStyle);
    applyGridStyle(currentGridStyle);
  });

  // Theme Dropdown
  themeSelectEl.addEventListener('change', (e) => {
    const theme = e.target.value;
    StorageManager.setTheme(theme);
    setMermaidTheme(theme);
    handleCodeChange(editorCtrl.getValue());
  });

  alertCloseBtn.addEventListener('click', hideAlert);

  // Editor Actions & Snippets
  $('formatCodeBtn').addEventListener('click', () => {
    editorCtrl.formatCode();
  });

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

  // Snippet Chips
  document.querySelectorAll('.snippet-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const snippet = btn.dataset.snippet;
      if (snippet) {
        editorCtrl.insertSnippet(`\n${snippet}\n`);
      }
    });
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

  // Saved Diagrams Modal Save Button
  $('modalSaveBtn').addEventListener('click', () => {
    const title = $('newDiagramTitle').value.trim() || 'Untitled Diagram';
    StorageManager.saveDiagram(title, editorCtrl.getValue());
    activeDiagramTitle = title;
    diagramTitleInput.value = title;
    refreshSavedList();
    updateProfileStats();
  });

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

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isTyping = e.target.matches('input, textarea, [contenteditable="true"]');

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      $('newDiagramTitle').value = activeDiagramTitle;
      refreshSavedList();
      openModal('savedModal');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      fileInput.click();
    } else if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      editorCtrl.formatCode();
    } else if (e.key === '?' && !isTyping) {
      e.preventDefault();
      openModal('shortcutsModal');
    } else if (!isTyping) {
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        canvasCtrl.fit(true);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        canvasCtrl.center(true);
      } else if (e.key === '0') {
        e.preventDefault();
        canvasCtrl.reset(true);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        canvasCtrl.setZoom(canvasCtrl.zoom * 1.2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        canvasCtrl.setZoom(canvasCtrl.zoom / 1.2);
      }
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
    diagramTitleInput.value = activeDiagramTitle;
    editorCtrl.setValue(code);
    setTimeout(() => canvasCtrl.fit(true), 120);
  };
  reader.readAsText(file);
}

function refreshDrawerSavedList() {
  const container = $('drawerSavedList');
  if (!container) return;
  const diagrams = StorageManager.getSavedDiagrams();
  container.innerHTML = '';

  if (diagrams.length === 0) {
    container.innerHTML = `<div class="diagram-empty-state">No saved diagrams yet. Use the Save button in the editor.</div>`;
    return;
  }

  diagrams.forEach((item) => {
    const row = document.createElement('div');
    row.className = cn(cardVariants({ variant: 'interactive', padding: 'sm' }), 'diagram-item');

    const info = document.createElement('div');
    info.className = 'diagram-item-info';
    info.innerHTML = `
      <div class="diagram-item-name font-medium text-foreground">${escapeHtml(item.title)}</div>
      <div class="diagram-item-date">${new Date(item.updatedAt).toLocaleString()}</div>
    `;
    info.addEventListener('click', () => {
      activeDiagramTitle = item.title;
      diagramTitleInput.value = item.title;
      editorCtrl.setValue(item.code);
      closeSidebarDrawer();
      setTimeout(() => canvasCtrl.fit(true), 100);
    });

    const actions = document.createElement('div');
    actions.className = 'diagram-item-actions';

    const deleteBtn = createButton({
      variant: 'ghost',
      size: 'icon-sm',
      className: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
      content: '🗑️',
      attributes: { title: 'Delete saved diagram' },
      onClick: (e) => {
        e.stopPropagation();
        StorageManager.deleteDiagram(item.id);
        refreshDrawerSavedList();
        updateProfileStats();
      },
    });

    actions.appendChild(deleteBtn);
    row.appendChild(info);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function refreshSavedList() {
  const container = $('savedListContainer');
  if (!container) return;
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
      diagramTitleInput.value = item.title;
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
      updateProfileStats();
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
    const activityRailOffset = 50;
    const newWidth = Math.max(260, Math.min(window.innerWidth * 0.75, e.clientX - activityRailOffset));
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
