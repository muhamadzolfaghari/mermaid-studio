/**
 * CAD/Figma-like interactive canvas engine for Mermaid Studio.
 * Ported and enhanced from the reference tourism dependency explorer.
 */

export class CanvasController {
  constructor(options) {
    this.stage = options.stage;
    this.canvas = options.canvas;
    this.container = options.container;
    this.zoomLabel = options.zoomLabel;
    this.wheelToggleBtn = options.wheelToggleBtn;
    this.fullscreenBtn = options.fullscreenBtn;

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.baseWidth = 1000;
    this.baseHeight = 800;
    this.wheelMode = 'zoom'; // 'zoom' or 'pan'
    this.animId = null;
    this.inertiaId = null;

    // Pointer tracking
    this.activePointers = new Map();
    this.isDragging = false;
    this.startPointerX = 0;
    this.startPointerY = 0;
    this.startPanX = 0;
    this.startPanY = 0;
    this.hasMovedSignificantly = false;

    // Velocity tracking for kinetic momentum release
    this.lastMoveTime = 0;
    this.lastMoveX = 0;
    this.lastMoveY = 0;
    this.velocityX = 0;
    this.velocityY = 0;

    // Touch pinch tracking
    this.pinchStartDist = 0;
    this.pinchStartZoom = 1;
    this.pinchCenterX = 0;
    this.pinchCenterY = 0;

    this.init();
  }

  init() {
    this.applyTransform();
    this.bindPointerEvents();
    this.bindWheelEvents();
    this.bindKeyboardEvents();
    this.bindWindowEvents();
  }

  applyTransform() {
    this.canvas.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.zoom})`;
    if (this.zoomLabel) {
      this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
    // Align background grid dots to pan position
    const gx = ((this.panX % 24) + 24) % 24;
    const gy = ((this.panY % 24) + 24) % 24;
    this.stage.style.backgroundPosition = `${gx}px ${gy}px`;
  }

  stopInertia() {
    if (this.inertiaId) {
      cancelAnimationFrame(this.inertiaId);
      this.inertiaId = null;
    }
  }

  startInertia(vx, vy) {
    this.stopInertia();
    let currVx = Math.max(-2.5, Math.min(2.5, vx));
    let currVy = Math.max(-2.5, Math.min(2.5, vy));
    let lastTime = performance.now();

    const step = (now) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      this.panX += currVx * dt;
      this.panY += currVy * dt;
      this.applyTransform();

      const decay = Math.pow(0.92, dt / 16);
      currVx *= decay;
      currVy *= decay;

      if (Math.hypot(currVx, currVy) > 0.02) {
        this.inertiaId = requestAnimationFrame(step);
      } else {
        this.inertiaId = null;
      }
    };
    this.inertiaId = requestAnimationFrame(step);
  }

  setZoom(value, anchorX = this.stage.clientWidth / 2, anchorY = this.stage.clientHeight / 2) {
    const nextZoom = Math.min(4.0, Math.max(0.08, value));
    if (Math.abs(nextZoom - this.zoom) < 0.0001) return;
    this.stopInertia();
    if (this.animId) cancelAnimationFrame(this.animId);

    const worldX = (anchorX - this.panX) / this.zoom;
    const worldY = (anchorY - this.panY) / this.zoom;
    this.zoom = nextZoom;
    this.panX = anchorX - worldX * this.zoom;
    this.panY = anchorY - worldY * this.zoom;
    this.applyTransform();
  }

  measure() {
    const svg = this.container.querySelector('svg');
    if (!svg) return;
    const box = svg.viewBox?.baseVal;
    let bbox = null;
    try {
      if (typeof svg.getBBox === 'function') {
        bbox = svg.getBBox();
      }
    } catch (_) {}
    const rect = svg.getBoundingClientRect();

    this.baseWidth = box?.width || bbox?.width || (rect.width / (this.zoom || 1)) || 1000;
    this.baseHeight = box?.height || bbox?.height || (rect.height / (this.zoom || 1)) || 800;

    if (this.container.classList.contains('is-gantt')) {
      this.baseWidth = Math.max(this.baseWidth, 2400);
    }
  }

  animateTo(targetPanX, targetPanY, targetZoom, duration = 260) {
    this.stopInertia();
    if (this.animId) cancelAnimationFrame(this.animId);
    const startPanX = this.panX;
    const startPanY = this.panY;
    const startZoom = this.zoom;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      this.panX = startPanX + (targetPanX - startPanX) * ease;
      this.panY = startPanY + (targetPanY - startPanY) * ease;
      this.zoom = startZoom + (targetZoom - startZoom) * ease;
      this.applyTransform();
      if (progress < 1) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.animId = null;
      }
    };
    this.animId = requestAnimationFrame(step);
  }

  fit(animate = false) {
    this.measure();
    if (!this.baseWidth || !this.baseHeight) return;
    const stageW = this.stage.clientWidth;
    const stageH = this.stage.clientHeight;
    if (stageW <= 0 || stageH <= 0) return;

    const paddingX = Math.min(64, Math.max(24, stageW * 0.06));
    const paddingY = Math.min(64, Math.max(24, stageH * 0.06));
    const availW = Math.max(80, stageW - paddingX * 2);
    const availH = Math.max(80, stageH - paddingY * 2);

    const scale = Math.min(1.25, Math.min(availW / this.baseWidth, availH / this.baseHeight));
    const targetZoom = Math.min(4.0, Math.max(0.08, scale));
    const targetPanX = (stageW - this.baseWidth * targetZoom) / 2;
    const targetPanY = Math.max(24, (stageH - this.baseHeight * targetZoom) / 2);

    if (animate) {
      this.animateTo(targetPanX, targetPanY, targetZoom);
    } else {
      this.stopInertia();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.panX = targetPanX;
      this.panY = targetPanY;
      this.zoom = targetZoom;
      this.applyTransform();
    }
  }

  reset(animate = true) {
    this.measure();
    const stageW = this.stage.clientWidth;
    const stageH = this.stage.clientHeight;
    const targetZoom = 1;
    let targetPanX = (stageW - this.baseWidth * targetZoom) / 2;
    let targetPanY = (stageH - this.baseHeight * targetZoom) / 2;

    if (animate) {
      this.animateTo(targetPanX, targetPanY, targetZoom);
    } else {
      this.stopInertia();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.panX = targetPanX;
      this.panY = targetPanY;
      this.zoom = targetZoom;
      this.applyTransform();
    }
  }

  center(animate = true) {
    this.measure();
    const stageW = this.stage.clientWidth;
    const stageH = this.stage.clientHeight;
    const targetPanX = (stageW - this.baseWidth * this.zoom) / 2;
    const targetPanY = (stageH - this.baseHeight * this.zoom) / 2;

    if (animate) {
      this.animateTo(targetPanX, targetPanY, this.zoom);
    } else {
      this.stopInertia();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.panX = targetPanX;
      this.panY = targetPanY;
      this.applyTransform();
    }
  }

  toggleWheelMode() {
    this.wheelMode = this.wheelMode === 'zoom' ? 'pan' : 'zoom';
    if (this.wheelToggleBtn) {
      this.wheelToggleBtn.textContent = this.wheelMode === 'zoom' ? 'Wheel: Zoom' : 'Wheel: Pan';
      this.wheelToggleBtn.classList.toggle('active-mode', this.wheelMode === 'pan');
    }
    return this.wheelMode;
  }

  isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  async toggleFullscreen() {
    try {
      if (!this.isFullscreen()) {
        const root = document.documentElement;
        if (root.requestFullscreen) await root.requestFullscreen();
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
        else if (root.msRequestFullscreen) await root.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        else if (document.msExitFullscreen) await document.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }

  updateFullscreenUI() {
    if (!this.fullscreenBtn) return;
    const active = this.isFullscreen();
    this.fullscreenBtn.classList.toggle('active-mode', active);
    this.fullscreenBtn.title = active ? 'Exit full screen (Shift+F / Esc)' : 'Full screen (Shift+F)';
  }

  bindPointerEvents() {
    this.stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return;
      this.stopInertia();
      if (this.animId) cancelAnimationFrame(this.animId);

      this.activePointers.set(event.pointerId, event);
      this.stage.setPointerCapture(event.pointerId);

      if (this.activePointers.size === 1) {
        this.isDragging = true;
        this.hasMovedSignificantly = false;
        this.startPointerX = event.clientX;
        this.startPointerY = event.clientY;
        this.startPanX = this.panX;
        this.startPanY = this.panY;

        this.lastMoveTime = performance.now();
        this.lastMoveX = event.clientX;
        this.lastMoveY = event.clientY;
        this.velocityX = 0;
        this.velocityY = 0;
        this.stage.classList.add('grabbing');
      } else if (this.activePointers.size === 2) {
        this.isDragging = false;
        this.stage.classList.remove('grabbing');
        const [p1, p2] = Array.from(this.activePointers.values());
        this.pinchStartDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
        this.pinchStartZoom = this.zoom;
        const rect = this.stage.getBoundingClientRect();
        this.pinchCenterX = (p1.clientX + p2.clientX) / 2 - rect.left;
        this.pinchCenterY = (p1.clientY + p2.clientY) / 2 - rect.top;
      }
    });

    this.stage.addEventListener('pointermove', (event) => {
      if (!this.activePointers.has(event.pointerId)) return;
      this.activePointers.set(event.pointerId, event);

      if (this.activePointers.size === 1 && this.isDragging) {
        const dx = event.clientX - this.startPointerX;
        const dy = event.clientY - this.startPointerY;

        if (Math.hypot(dx, dy) > 4) {
          this.hasMovedSignificantly = true;
        }

        this.panX = this.startPanX + dx;
        this.panY = this.startPanY + dy;
        this.applyTransform();

        const now = performance.now();
        const dt = now - this.lastMoveTime;
        if (dt > 8) {
          const vx = (event.clientX - this.lastMoveX) / dt;
          const vy = (event.clientY - this.lastMoveY) / dt;
          this.velocityX = this.velocityX * 0.3 + vx * 0.7;
          this.velocityY = this.velocityY * 0.3 + vy * 0.7;
          this.lastMoveTime = now;
          this.lastMoveX = event.clientX;
          this.lastMoveY = event.clientY;
        }
      } else if (this.activePointers.size === 2) {
        this.hasMovedSignificantly = true;
        const [p1, p2] = Array.from(this.activePointers.values());
        const curDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
        if (this.pinchStartDist > 0 && curDist > 0) {
          const scaleFactor = curDist / this.pinchStartDist;
          this.setZoom(this.pinchStartZoom * scaleFactor, this.pinchCenterX, this.pinchCenterY);
        }
      }
    });

    const stopPointer = (event) => {
      if (this.activePointers.has(event.pointerId)) {
        if (this.stage.hasPointerCapture(event.pointerId)) {
          this.stage.releasePointerCapture(event.pointerId);
        }
        this.activePointers.delete(event.pointerId);
      }

      if (this.activePointers.size === 0) {
        this.stage.classList.remove('grabbing');
        if (this.isDragging) {
          this.isDragging = false;
          const speed = Math.hypot(this.velocityX, this.velocityY);
          const now = performance.now();
          if (speed > 0.15 && now - this.lastMoveTime < 100) {
            this.startInertia(this.velocityX, this.velocityY);
          }
        }
      } else if (this.activePointers.size === 1) {
        const remaining = this.activePointers.values().next().value;
        this.isDragging = true;
        this.stage.classList.add('grabbing');
        this.startPointerX = remaining.clientX;
        this.startPointerY = remaining.clientY;
        this.startPanX = this.panX;
        this.startPanY = this.panY;
        this.lastMoveTime = performance.now();
        this.lastMoveX = remaining.clientX;
        this.lastMoveY = remaining.clientY;
        this.velocityX = 0;
        this.velocityY = 0;
      }
    };

    this.stage.addEventListener('pointerup', stopPointer);
    this.stage.addEventListener('pointercancel', stopPointer);

    this.stage.addEventListener(
      'click',
      (event) => {
        if (this.hasMovedSignificantly) {
          event.stopPropagation();
          event.preventDefault();
          this.hasMovedSignificantly = false;
        }
      },
      true
    );
  }

  bindWheelEvents() {
    this.stage.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.stopInertia();
        if (this.animId) cancelAnimationFrame(this.animId);

        const rect = this.stage.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const isZoom = event.ctrlKey || event.metaKey;

        if (isZoom || (this.wheelMode === 'zoom' && event.deltaX === 0 && !event.shiftKey)) {
          const factor = event.ctrlKey
            ? Math.exp(-event.deltaY * 0.008)
            : Math.exp(-event.deltaY * 0.0016);
          this.setZoom(this.zoom * factor, mouseX, mouseY);
        } else if (event.shiftKey) {
          this.panX -= event.deltaY * 1.2;
          this.applyTransform();
        } else {
          this.panX -= event.deltaX;
          this.panY -= event.deltaY;
          this.applyTransform();
        }
      },
      { passive: false }
    );
  }

  bindKeyboardEvents() {
    window.addEventListener('keydown', (event) => {
      if (event.target.matches('input,textarea,select')) return;
      const step = event.shiftKey ? 180 : 60;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.stopInertia();
          this.panX += step;
          this.applyTransform();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.stopInertia();
          this.panX -= step;
          this.applyTransform();
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.stopInertia();
          this.panY += step;
          this.applyTransform();
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.stopInertia();
          this.panY -= step;
          this.applyTransform();
          break;
        case '+':
        case '=':
          event.preventDefault();
          this.setZoom(this.zoom * 1.2);
          break;
        case '-':
        case '_':
          event.preventDefault();
          this.setZoom(this.zoom / 1.2);
          break;
        case '0':
          event.preventDefault();
          this.reset(true);
          break;
        case 'F11':
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case 'f':
        case 'F':
          if (event.shiftKey) {
            event.preventDefault();
            this.toggleFullscreen();
          } else {
            event.preventDefault();
            this.fit(true);
          }
          break;
        case 'c':
        case 'C':
          event.preventDefault();
          this.center(true);
          break;
      }
    });
  }

  bindWindowEvents() {
    window.addEventListener('resize', () => {
      this.applyTransform();
    });

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
      (evt) => document.addEventListener(evt, () => this.updateFullscreenUI())
    );
  }
}
