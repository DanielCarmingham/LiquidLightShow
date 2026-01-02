import type { Force } from '../input/InputManager';

export class AutoAnimator {
  private _isActive = true;
  private time = 0;
  private wanderers: Wanderer[] = [];
  private numWanderers = 3;

  get isActive(): boolean {
    return this._isActive;
  }

  set isActive(value: boolean) {
    this._isActive = value;
  }

  toggle(): void {
    this._isActive = !this._isActive;
  }

  constructor() {
    // Initialize wandering force points
    for (let i = 0; i < this.numWanderers; i++) {
      this.wanderers.push(new Wanderer(i / this.numWanderers));
    }
  }

  getForces(deltaTime: number, audioIntensity = 0): Force[] {
    if (!this._isActive) return [];

    this.time += deltaTime;
    const forces: Force[] = [];

    for (const wanderer of this.wanderers) {
      const force = wanderer.update(this.time, deltaTime, audioIntensity);
      if (force) {
        forces.push(force);
      }
    }

    return forces;
  }

  reset(): void {
    this.time = 0;
    this.wanderers = [];
    for (let i = 0; i < this.numWanderers; i++) {
      this.wanderers.push(new Wanderer(i / this.numWanderers));
    }
  }
}

class Wanderer {
  private x: number;
  private y: number;
  private lastX: number;
  private lastY: number;
  private hue: number;
  private speed: number;
  private noiseOffset: number;

  constructor(hueOffset: number) {
    this.x = Math.random();
    this.y = Math.random();
    this.lastX = this.x;
    this.lastY = this.y;
    this.hue = hueOffset;
    this.speed = 0.3 + Math.random() * 0.3;
    this.noiseOffset = Math.random() * 1000;
  }

  update(time: number, deltaTime: number, audioIntensity: number): Force | null {
    this.lastX = this.x;
    this.lastY = this.y;

    // Use simplex-like noise for organic movement
    const t = time * this.speed + this.noiseOffset;
    const speedMod = 1 + audioIntensity * 2;

    // Create smooth wandering path using sine waves with different frequencies
    const angle1 = Math.sin(t * 0.7) * Math.PI;
    const angle2 = Math.cos(t * 0.5) * Math.PI * 0.5;
    const angle3 = Math.sin(t * 1.1 + 1.5) * Math.PI * 0.3;

    const combinedAngle = angle1 + angle2 + angle3;

    // Move based on combined angle
    this.x += Math.cos(combinedAngle) * deltaTime * 0.2 * speedMod;
    this.y += Math.sin(combinedAngle) * deltaTime * 0.2 * speedMod;

    // Wrap around edges with some padding
    const padding = 0.1;
    if (this.x < padding) this.x = 1 - padding;
    if (this.x > 1 - padding) this.x = padding;
    if (this.y < padding) this.y = 1 - padding;
    if (this.y > 1 - padding) this.y = padding;

    // Calculate velocity
    const dx = (this.x - this.lastX) * 5;
    const dy = (this.y - this.lastY) * 5;

    // Only emit force if there's meaningful movement
    if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
      return null;
    }

    // Slowly shift hue over time
    this.hue = (this.hue + deltaTime * 0.02) % 1;

    return {
      x: this.x,
      y: this.y,
      dx: dx * (1 + audioIntensity),
      dy: dy * (1 + audioIntensity),
      color: this.hslToRgb(this.hue, 0.9, 0.5),
    };
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
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
}
