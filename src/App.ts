import * as THREE from 'three';
import { FluidSimulation } from './simulation/FluidSimulation';
import { AudioAnalyzer, type AudioData } from './audio/AudioAnalyzer';
import { InputManager, type Force } from './input/InputManager';
import { AutoAnimator } from './animation/AutoAnimator';

export class App {
  private renderer: THREE.WebGLRenderer;
  private simulation: FluidSimulation;
  private audio: AudioAnalyzer;
  private input: InputManager;
  private autoAnimator: AutoAnimator;
  private clock: THREE.Clock;

  private helpOverlay: HTMLElement;
  private micIndicator: HTMLElement;
  private statusElement: HTMLElement;

  private isRunning = false;
  private showHelp = true;

  constructor(container: HTMLElement) {
    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Initialize WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = true;
    this.renderer.setClearColor(0x000000, 1);

    // Get DOM elements
    this.helpOverlay = document.getElementById('help-overlay')!;
    this.micIndicator = document.getElementById('mic-indicator')!;
    this.statusElement = document.getElementById('status')!;

    // Initialize components
    this.simulation = new FluidSimulation(this.renderer);
    this.audio = new AudioAnalyzer();
    this.input = new InputManager(canvas);
    this.autoAnimator = new AutoAnimator();
    this.clock = new THREE.Clock();

    // Setup
    this.setupKeyboardControls();
    this.setupHelpOverlay();
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));

    // Show help initially
    this.helpOverlay.classList.add('visible');
  }

  private setupKeyboardControls(): void {
    // Palette switching (1-9)
    for (let i = 1; i <= 9; i++) {
      this.input.onKey(String(i), () => {
        this.simulation.setPalette(i - 1);
        this.updateStatus(`Palette ${i}`);
      });
    }

    // Toggle auto-animation
    this.input.onKey(' ', () => {
      this.autoAnimator.toggle();
      this.updateStatus(this.autoAnimator.isActive ? 'Auto mode ON' : 'Auto mode OFF');
    });

    // Toggle microphone
    this.input.onKey('m', async () => {
      const result = await this.audio.toggle();
      this.micIndicator.classList.toggle('active', result);
      this.updateStatus(result ? 'Microphone ON' : 'Microphone OFF');
    });

    // Speed controls
    this.input.onKey('=', () => {
      this.simulation.adjustSpeed(0.1);
      this.updateStatus(`Speed: ${this.simulation.getSpeed().toFixed(1)}x`);
    });
    this.input.onKey('+', () => {
      this.simulation.adjustSpeed(0.1);
      this.updateStatus(`Speed: ${this.simulation.getSpeed().toFixed(1)}x`);
    });
    this.input.onKey('-', () => {
      this.simulation.adjustSpeed(-0.1);
      this.updateStatus(`Speed: ${this.simulation.getSpeed().toFixed(1)}x`);
    });

    // Reset
    this.input.onKey('r', () => {
      this.simulation.reset();
      this.autoAnimator.reset();
      this.updateStatus('Reset');
    });

    // Fullscreen
    this.input.onKey('f', () => {
      this.toggleFullscreen();
    });

    // Help toggle
    this.input.onKey('h', () => {
      this.toggleHelp();
    });

    // Escape to close help
    this.input.onKey('Escape', () => {
      if (this.showHelp) {
        this.toggleHelp();
      }
    });
  }

  private setupHelpOverlay(): void {
    // Click anywhere to dismiss help
    this.helpOverlay.addEventListener('click', () => {
      this.toggleHelp();
    });
  }

  private toggleHelp(): void {
    this.showHelp = !this.showHelp;
    this.helpOverlay.classList.toggle('visible', this.showHelp);
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        this.updateStatus('Fullscreen not available');
      });
    } else {
      document.exitFullscreen();
    }
  }

  private updateStatus(message: string): void {
    this.statusElement.textContent = message;
    this.statusElement.style.opacity = '1';

    setTimeout(() => {
      this.statusElement.style.opacity = '0.5';
    }, 1500);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
  }

  private update(): void {
    const deltaTime = Math.min(this.clock.getDelta(), 0.033); // Cap at ~30fps minimum

    // Get audio data
    const audioData: AudioData = this.audio.getFrequencyData();

    // Get forces from input or auto-animator
    let forces: Force[];

    if (this.input.isInteracting) {
      forces = this.input.getForces();
      // Temporarily pause auto-animation during interaction
    } else if (this.autoAnimator.isActive) {
      forces = this.autoAnimator.getForces(deltaTime, audioData.bass);
    } else {
      forces = this.input.getForces();
    }

    // Step simulation
    this.simulation.step(deltaTime, forces, audioData);

    // Render to screen
    this.simulation.render(audioData);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const animate = () => {
      if (!this.isRunning) return;
      requestAnimationFrame(animate);
      this.update();
    };

    animate();
  }

  stop(): void {
    this.isRunning = false;
    this.clock.stop();
  }

  dispose(): void {
    this.stop();
    this.audio.stop();
    this.input.destroy();
    this.simulation.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
