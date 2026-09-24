/**
 * Interactive Minimap for CAD Canvas
 * Provides a live scaled overview and draggable camera viewport frustum.
 */

export class MiniMapController {
  constructor(options) {
    this.container = options.container;
    this.canvasCtrl = options.canvasCtrl;
    this.diagramContainer = options.diagramContainer;
    this.stage = options.stage;
    this.isVisible = true;

    this.mapSvg = null;
    this.viewRect = null;
    this.isDragging = false;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="minimap-header">
        <span class="minimap-title">Navigator</span>
        <button id="closeMinimapBtn" class="minimap-close" type="button" title="Hide Navigator">✕</button>
      </div>
      <div class="minimap-viewport" id="minimapViewport">
        <div class="minimap-content" id="minimapContent"></div>
        <div class="minimap-rect" id="minimapRect"></div>
      </div>
    `;

    this.viewportEl = this.container.querySelector('#minimapViewport');
    this.contentEl = this.container.querySelector('#minimapContent');
    this.viewRect = this.container.querySelector('#minimapRect');

    this.container.querySelector('#closeMinimapBtn').addEventListener('click', () => {
      this.toggle(false);
    });

    this.bindEvents();
  }

  toggle(show = !this.isVisible) {
    this.isVisible = show;
    this.container.style.display = this.isVisible ? 'flex' : 'none';
    if (this.isVisible) {
      this.update();
    }
  }

  bindEvents() {
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      this.panFromMinimap(e);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      this.panFromMinimap(e);
    };

    const onPointerUp = () => {
      this.isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    this.viewportEl.addEventListener('pointerdown', onPointerDown);
  }

  panFromMinimap(e) {
    const rect = this.viewportEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const clickY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const totalW = Math.max(this.canvasCtrl.baseWidth, 400);
    const totalH = Math.max(this.canvasCtrl.baseHeight, 300);

    const worldTargetX = (clickX / rect.width) * totalW;
    const worldTargetY = (clickY / rect.height) * totalH;

    // Center target world coords in stage
    const stageW = this.stage.clientWidth;
    const stageH = this.stage.clientHeight;

    const newPanX = stageW / 2 - worldTargetX * this.canvasCtrl.zoom;
    const newPanY = stageH / 2 - worldTargetY * this.canvasCtrl.zoom;

    this.canvasCtrl.panX = newPanX;
    this.canvasCtrl.panY = newPanY;
    this.canvasCtrl.applyTransform();
    this.updateRect();
  }

  update() {
    if (!this.isVisible) return;
    const svg = this.diagramContainer.querySelector('svg');
    if (!svg) {
      this.contentEl.innerHTML = '';
      return;
    }

    // Clone miniature SVG
    const clone = svg.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.pointerEvents = 'none';

    this.contentEl.innerHTML = '';
    this.contentEl.appendChild(clone);

    this.updateRect();
  }

  updateRect() {
    if (!this.isVisible || !this.viewRect) return;

    const totalW = Math.max(this.canvasCtrl.baseWidth, 400);
    const totalH = Math.max(this.canvasCtrl.baseHeight, 300);

    const stageW = this.stage.clientWidth;
    const stageH = this.stage.clientHeight;
    const vpW = this.viewportEl.clientWidth || 160;
    const vpH = this.viewportEl.clientHeight || 100;

    const scaleX = vpW / totalW;
    const scaleY = vpH / totalH;

    // Viewport bounds in world coords
    const worldLeft = -this.canvasCtrl.panX / this.canvasCtrl.zoom;
    const worldTop = -this.canvasCtrl.panY / this.canvasCtrl.zoom;
    const worldWidth = stageW / this.canvasCtrl.zoom;
    const worldHeight = stageH / this.canvasCtrl.zoom;

    const rx = Math.max(0, Math.min(vpW, worldLeft * scaleX));
    const ry = Math.max(0, Math.min(vpH, worldTop * scaleY));
    const rw = Math.max(12, Math.min(vpW - rx, worldWidth * scaleX));
    const rh = Math.max(12, Math.min(vpH - ry, worldHeight * scaleY));

    this.viewRect.style.left = `${rx}px`;
    this.viewRect.style.top = `${ry}px`;
    this.viewRect.style.width = `${rw}px`;
    this.viewRect.style.height = `${rh}px`;
  }
}
