export interface Force {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: [number, number, number];
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private _isInteracting = false;
  private currentPos = { x: 0, y: 0 };
  private lastPos = { x: 0, y: 0 };
  private forces: Force[] = [];
  private colorHue = 0;

  // Keyboard state
  private keys: Set<string> = new Set();
  private keyCallbacks: Map<string, () => void> = new Map();

  get isInteracting(): boolean {
    return this._isInteracting;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onPointerUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onPointerUp.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false,
    });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), {
      passive: false,
    });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));

    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private getNormalizedPosition(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: 1 - (clientY - rect.top) / rect.height, // Flip Y for WebGL
    };
  }

  private getRandomColor(): [number, number, number] {
    // Generate vibrant colors by using HSL and converting to RGB
    this.colorHue = (this.colorHue + 0.1 + Math.random() * 0.2) % 1;
    const h = this.colorHue;
    const s = 0.8 + Math.random() * 0.2;
    const l = 0.5 + Math.random() * 0.2;

    // HSL to RGB conversion
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return [
      hueToRgb(p, q, h + 1 / 3),
      hueToRgb(p, q, h),
      hueToRgb(p, q, h - 1 / 3),
    ];
  }

  private onPointerDown(e: MouseEvent): void {
    this._isInteracting = true;
    const pos = this.getNormalizedPosition(e.clientX, e.clientY);
    this.currentPos = pos;
    this.lastPos = pos;
  }

  private onPointerMove(e: MouseEvent): void {
    const pos = this.getNormalizedPosition(e.clientX, e.clientY);
    this.lastPos = { ...this.currentPos };
    this.currentPos = pos;

    if (this._isInteracting) {
      this.addForce();
    }
  }

  private onPointerUp(): void {
    this._isInteracting = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      this._isInteracting = true;
      const touch = e.touches[0];
      const pos = this.getNormalizedPosition(touch.clientX, touch.clientY);
      this.currentPos = pos;
      this.lastPos = pos;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const pos = this.getNormalizedPosition(touch.clientX, touch.clientY);
      this.lastPos = { ...this.currentPos };
      this.currentPos = pos;

      if (this._isInteracting) {
        this.addForce();
      }
    }
  }

  private onTouchEnd(): void {
    this._isInteracting = false;
  }

  private addForce(): void {
    const dx = this.currentPos.x - this.lastPos.x;
    const dy = this.currentPos.y - this.lastPos.y;

    // Only add force if there's significant movement
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      this.forces.push({
        x: this.currentPos.x,
        y: this.currentPos.y,
        dx: dx * 10,
        dy: dy * 10,
        color: this.getRandomColor(),
      });
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());

    const callback = this.keyCallbacks.get(e.key.toLowerCase());
    if (callback) {
      callback();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  onKey(key: string, callback: () => void): void {
    this.keyCallbacks.set(key.toLowerCase(), callback);
  }

  getForces(): Force[] {
    const result = [...this.forces];
    this.forces = [];
    return result;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
