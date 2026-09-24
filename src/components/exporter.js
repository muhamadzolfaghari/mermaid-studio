/**
 * Exporter utilities for Mermaid Studio
 * Provides SVG export, high-DPI PNG export, .mmd file download, and clipboard copy.
 */

export class Exporter {
  static sanitizeFilename(name) {
    return (name || 'diagram')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'mermaid-diagram';
  }

  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  static downloadSource(code, title = 'diagram') {
    const filename = `${this.sanitizeFilename(title)}.mmd`;
    const blob = new Blob([code], { type: 'text/vnd.mermaid;charset=utf-8' });
    this.downloadBlob(blob, filename);
  }

  static getCleanSvgString(svgEl) {
    if (!svgEl) return null;
    const clone = svgEl.cloneNode(true);

    // Ensure viewBox and dimensions
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!clone.getAttribute('xmlns:xlink')) {
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    // Add XML declaration if missing
    if (!svgString.startsWith('<?xml')) {
      svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    }
    return svgString;
  }

  static downloadSvg(container, title = 'diagram') {
    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('No diagram found to export.');

    const svgString = this.getCleanSvgString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const filename = `${this.sanitizeFilename(title)}.svg`;
    this.downloadBlob(blob, filename);
  }

  static async downloadPng(container, title = 'diagram', scale = 2) {
    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('No diagram found to export.');

    const svgString = this.getCleanSvgString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Determine dimensions
    const box = svgEl.viewBox?.baseVal;
    let width = box?.width || svgEl.clientWidth || 1200;
    let height = box?.height || svgEl.clientHeight || 800;

    if (container.classList.contains('is-gantt')) {
      width = Math.max(width, 2400);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }

          // Dark background for contrast matching the dark theme
          ctx.fillStyle = '#070c16';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (pngBlob) => {
              URL.revokeObjectURL(url);
              if (pngBlob) {
                const filename = `${this.sanitizeFilename(title)}.png`;
                this.downloadBlob(pngBlob, filename);
                resolve();
              } else {
                reject(new Error('PNG blob creation failed'));
              }
            },
            'image/png'
          );
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG into image for PNG rendering'));
      };

      img.src = url;
    });
  }

  static async copySvg(container) {
    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('No diagram found to copy.');
    const svgString = this.getCleanSvgString(svgEl);
    await navigator.clipboard.writeText(svgString);
  }

  static async copyMarkdown(code) {
    const markdown = '```mermaid\n' + code.trim() + '\n```';
    await navigator.clipboard.writeText(markdown);
  }
}
