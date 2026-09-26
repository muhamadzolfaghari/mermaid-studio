/**
 * Local storage manager for Mermaid Studio
 * Handles automatic draft saving and a named diagrams library.
 */

const STORAGE_KEYS = {
  DRAFT: 'mermaid_studio_draft_v1',
  SAVED_LIST: 'mermaid_studio_saved_diagrams_v1',
  THEME: 'mermaid_studio_theme_v1',
  GRID: 'mermaid_studio_grid_v1',
  ACTIVE_TEMPLATE: 'mermaid_studio_active_tpl_v1',
  VERSIONS: 'mermaid_studio_versions_v1',
};

export class StorageManager {
  // Draft Autosave
  static saveDraft(code, templateId = '') {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFT, code);
      if (templateId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TEMPLATE, templateId);
      }
    } catch (e) {
      console.warn('Draft autosave failed:', e);
    }
  }

  static getDraft() {
    try {
      return localStorage.getItem(STORAGE_KEYS.DRAFT) || null;
    } catch (_) {
      return null;
    }
  }

  static getActiveTemplateId() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_TEMPLATE) || null;
    } catch (_) {
      return null;
    }
  }

  // Saved Diagrams Library
  static getSavedDiagrams() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVED_LIST);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  }

  static saveDiagram(title, code) {
    const list = this.getSavedDiagrams();
    const existingIndex = list.findIndex((d) => d.title.toLowerCase() === title.trim().toLowerCase());
    const item = {
      id: existingIndex >= 0 ? list[existingIndex].id : `diag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      code,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.unshift(item);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LIST, JSON.stringify(list));
      return item;
    } catch (e) {
      console.error('Failed to save diagram to storage:', e);
      throw e;
    }
  }

  static deleteDiagram(id) {
    let list = this.getSavedDiagrams();
    list = list.filter((d) => d.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LIST, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete diagram:', e);
    }
  }

  // Version Snapshots
  static getSnapshots() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VERSIONS);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  }

  static saveSnapshot(versionLabel, title, code) {
    const list = this.getSnapshots();
    const item = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      version: versionLabel.trim() || `v0.${list.length + 1}`,
      title: title.trim() || 'Untitled',
      code,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    try {
      localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(list));
      return item;
    } catch (e) {
      console.error('Failed to save snapshot:', e);
      throw e;
    }
  }

  static deleteSnapshot(id) {
    let list = this.getSnapshots();
    list = list.filter((s) => s.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete snapshot:', e);
    }
  }

  // User Preferences
  static getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  }

  static setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  static getGridStyle() {
    return localStorage.getItem(STORAGE_KEYS.GRID) || 'dots';
  }

  static setGridStyle(grid) {
    localStorage.setItem(STORAGE_KEYS.GRID, grid);
  }
}
