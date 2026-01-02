import * as THREE from 'three';
import type { Force } from '../input/InputManager';

// Import shaders
import advectionFrag from '../shaders/simulation/advection.frag';
import diffusionFrag from '../shaders/simulation/diffusion.frag';
import forcesFrag from '../shaders/simulation/forces.frag';
import divergenceFrag from '../shaders/simulation/divergence.frag';
import pressureFrag from '../shaders/simulation/pressure.frag';
import gradientFrag from '../shaders/simulation/gradient.frag';
import dyeFrag from '../shaders/simulation/dye.frag';
import displayVert from '../shaders/display/display.vert';
import iridescenceFrag from '../shaders/display/iridescence.frag';

const baseVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

interface SimulationConfig {
  simResolution: number;
  dyeResolution: number;
  viscosity: number;
  velocityDissipation: number;
  dyeDissipation: number;
  pressureIterations: number;
  forceRadius: number;
  forceStrength: number;
}

const defaultConfig: SimulationConfig = {
  simResolution: 256,
  dyeResolution: 512,
  viscosity: 0.5,
  velocityDissipation: 0.98,
  dyeDissipation: 0.97,
  pressureIterations: 20,
  forceRadius: 0.04,
  forceStrength: 1.0,
};

export class FluidSimulation {
  private renderer: THREE.WebGLRenderer;
  private config: SimulationConfig;

  // Render targets (ping-pong buffers)
  private velocityRead!: THREE.WebGLRenderTarget;
  private velocityWrite!: THREE.WebGLRenderTarget;
  private dyeRead!: THREE.WebGLRenderTarget;
  private dyeWrite!: THREE.WebGLRenderTarget;
  private divergence!: THREE.WebGLRenderTarget;
  private pressureRead!: THREE.WebGLRenderTarget;
  private pressureWrite!: THREE.WebGLRenderTarget;

  // Shader materials
  private advectionMaterial!: THREE.ShaderMaterial;
  private diffusionMaterial!: THREE.ShaderMaterial;
  private forcesMaterial!: THREE.ShaderMaterial;
  private divergenceMaterial!: THREE.ShaderMaterial;
  private pressureMaterial!: THREE.ShaderMaterial;
  private gradientMaterial!: THREE.ShaderMaterial;
  private dyeMaterial!: THREE.ShaderMaterial;
  private displayMaterial!: THREE.ShaderMaterial;

  // Scene for rendering
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  // Texel sizes
  private simTexelSize: THREE.Vector2;
  private dyeTexelSize: THREE.Vector2;

  // Display state
  private palette = 0;
  private filmThickness = 1.5;
  private colorIntensity = 1.0;
  private time = 0;
  private speed = 1.0;

  constructor(renderer: THREE.WebGLRenderer, config: Partial<SimulationConfig> = {}) {
    this.renderer = renderer;
    this.config = { ...defaultConfig, ...config };

    this.simTexelSize = new THREE.Vector2(
      1 / this.config.simResolution,
      1 / this.config.simResolution
    );
    this.dyeTexelSize = new THREE.Vector2(
      1 / this.config.dyeResolution,
      1 / this.config.dyeResolution
    );

    // Create scene and camera for fullscreen quad rendering
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);

    this.initRenderTargets();
    this.initMaterials();
  }

  private createRenderTarget(
    width: number,
    height: number,
    format: THREE.PixelFormat = THREE.RGBAFormat
  ): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: format,
      type: THREE.HalfFloatType,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
  }

  private initRenderTargets(): void {
    const simRes = this.config.simResolution;
    const dyeRes = this.config.dyeResolution;

    // Velocity buffers (RG for velocity components)
    this.velocityRead = this.createRenderTarget(simRes, simRes);
    this.velocityWrite = this.createRenderTarget(simRes, simRes);

    // Dye buffers (RGB for color)
    this.dyeRead = this.createRenderTarget(dyeRes, dyeRes);
    this.dyeWrite = this.createRenderTarget(dyeRes, dyeRes);

    // Divergence (single channel)
    this.divergence = this.createRenderTarget(simRes, simRes);

    // Pressure buffers
    this.pressureRead = this.createRenderTarget(simRes, simRes);
    this.pressureWrite = this.createRenderTarget(simRes, simRes);
  }

  private initMaterials(): void {
    // Advection material
    this.advectionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        velocityTexture: { value: null },
        sourceTexture: { value: null },
        deltaTime: { value: 0.016 },
        dissipation: { value: this.config.velocityDissipation },
        texelSize: { value: this.simTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: advectionFrag,
    });

    // Diffusion material
    this.diffusionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        velocityTexture: { value: null },
        viscosity: { value: this.config.viscosity },
        texelSize: { value: this.simTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: diffusionFrag,
    });

    // Forces material
    this.forcesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        velocityTexture: { value: null },
        point: { value: new THREE.Vector2() },
        force: { value: new THREE.Vector2() },
        radius: { value: this.config.forceRadius },
        texelSize: { value: this.simTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: forcesFrag,
    });

    // Divergence material
    this.divergenceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        velocityTexture: { value: null },
        texelSize: { value: this.simTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: divergenceFrag,
    });

    // Pressure material
    this.pressureMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pressureTexture: { value: null },
        divergenceTexture: { value: null },
        texelSize: { value: this.simTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: pressureFrag,
    });

    // Gradient subtraction material
    this.gradientMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pressureTexture: { value: null },
        velocityTexture: { value: null },
        texelSize: { value: this.simTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: gradientFrag,
    });

    // Dye material
    this.dyeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dyeTexture: { value: null },
        point: { value: new THREE.Vector2() },
        color: { value: new THREE.Vector3() },
        radius: { value: this.config.forceRadius * 1.5 },
        texelSize: { value: this.dyeTexelSize },
      },
      vertexShader: baseVert,
      fragmentShader: dyeFrag,
    });

    // Display material
    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        velocityTexture: { value: null },
        dyeTexture: { value: null },
        time: { value: 0 },
        filmThickness: { value: this.filmThickness },
        colorIntensity: { value: this.colorIntensity },
        palette: { value: this.palette },
        audioReactivity: { value: new THREE.Vector3() },
      },
      vertexShader: displayVert,
      fragmentShader: iridescenceFrag,
    });
  }

  private blit(target: THREE.WebGLRenderTarget | null): void {
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  private swapVelocity(): void {
    const temp = this.velocityRead;
    this.velocityRead = this.velocityWrite;
    this.velocityWrite = temp;
  }

  private swapDye(): void {
    const temp = this.dyeRead;
    this.dyeRead = this.dyeWrite;
    this.dyeWrite = temp;
  }

  private swapPressure(): void {
    const temp = this.pressureRead;
    this.pressureRead = this.pressureWrite;
    this.pressureWrite = temp;
  }

  step(deltaTime: number, forces: Force[], _audioData = { bass: 0, mids: 0, highs: 0 }): void {
    const dt = deltaTime * this.speed;
    this.time += dt;

    // Apply forces from input
    for (const force of forces) {
      // Add velocity force
      this.forcesMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
      this.forcesMaterial.uniforms.point.value.set(force.x, force.y);
      this.forcesMaterial.uniforms.force.value.set(
        force.dx * this.config.forceStrength,
        force.dy * this.config.forceStrength
      );
      this.quad.material = this.forcesMaterial;
      this.blit(this.velocityWrite);
      this.swapVelocity();

      // Add dye
      this.dyeMaterial.uniforms.dyeTexture.value = this.dyeRead.texture;
      this.dyeMaterial.uniforms.point.value.set(force.x, force.y);
      this.dyeMaterial.uniforms.color.value.set(force.color[0], force.color[1], force.color[2]);
      this.quad.material = this.dyeMaterial;
      this.blit(this.dyeWrite);
      this.swapDye();
    }

    // Diffusion (viscosity)
    for (let i = 0; i < 4; i++) {
      this.diffusionMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
      this.quad.material = this.diffusionMaterial;
      this.blit(this.velocityWrite);
      this.swapVelocity();
    }

    // Calculate divergence
    this.divergenceMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
    this.quad.material = this.divergenceMaterial;
    this.blit(this.divergence);

    // Clear pressure
    this.renderer.setRenderTarget(this.pressureRead);
    this.renderer.clear();

    // Pressure solve (Jacobi iterations)
    for (let i = 0; i < this.config.pressureIterations; i++) {
      this.pressureMaterial.uniforms.pressureTexture.value = this.pressureRead.texture;
      this.pressureMaterial.uniforms.divergenceTexture.value = this.divergence.texture;
      this.quad.material = this.pressureMaterial;
      this.blit(this.pressureWrite);
      this.swapPressure();
    }

    // Subtract pressure gradient
    this.gradientMaterial.uniforms.pressureTexture.value = this.pressureRead.texture;
    this.gradientMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
    this.quad.material = this.gradientMaterial;
    this.blit(this.velocityWrite);
    this.swapVelocity();

    // Advect velocity
    this.advectionMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
    this.advectionMaterial.uniforms.sourceTexture.value = this.velocityRead.texture;
    this.advectionMaterial.uniforms.deltaTime.value = dt;
    this.advectionMaterial.uniforms.dissipation.value = this.config.velocityDissipation;
    this.quad.material = this.advectionMaterial;
    this.blit(this.velocityWrite);
    this.swapVelocity();

    // Advect dye
    this.advectionMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
    this.advectionMaterial.uniforms.sourceTexture.value = this.dyeRead.texture;
    this.advectionMaterial.uniforms.dissipation.value = this.config.dyeDissipation;
    this.advectionMaterial.uniforms.texelSize.value = this.dyeTexelSize;
    this.quad.material = this.advectionMaterial;
    this.blit(this.dyeWrite);
    this.swapDye();

    // Reset texel size
    this.advectionMaterial.uniforms.texelSize.value = this.simTexelSize;
  }

  render(audioData = { bass: 0, mids: 0, highs: 0 }): void {
    // Update display material uniforms
    this.displayMaterial.uniforms.velocityTexture.value = this.velocityRead.texture;
    this.displayMaterial.uniforms.dyeTexture.value = this.dyeRead.texture;
    this.displayMaterial.uniforms.time.value = this.time;
    this.displayMaterial.uniforms.filmThickness.value = this.filmThickness;
    this.displayMaterial.uniforms.colorIntensity.value = this.colorIntensity;
    this.displayMaterial.uniforms.palette.value = this.palette;
    this.displayMaterial.uniforms.audioReactivity.value.set(
      audioData.bass,
      audioData.mids,
      audioData.highs
    );

    // Render to screen
    this.quad.material = this.displayMaterial;
    this.blit(null);
  }

  setPalette(index: number): void {
    this.palette = Math.max(0, Math.min(8, index));
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(3, speed));
  }

  adjustSpeed(delta: number): void {
    this.setSpeed(this.speed + delta);
  }

  getSpeed(): number {
    return this.speed;
  }

  reset(): void {
    // Clear all render targets
    this.renderer.setRenderTarget(this.velocityRead);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.velocityWrite);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.dyeRead);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.dyeWrite);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.pressureRead);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.pressureWrite);
    this.renderer.clear();
    this.renderer.setRenderTarget(null);

    this.time = 0;
  }

  dispose(): void {
    this.velocityRead.dispose();
    this.velocityWrite.dispose();
    this.dyeRead.dispose();
    this.dyeWrite.dispose();
    this.divergence.dispose();
    this.pressureRead.dispose();
    this.pressureWrite.dispose();

    this.advectionMaterial.dispose();
    this.diffusionMaterial.dispose();
    this.forcesMaterial.dispose();
    this.divergenceMaterial.dispose();
    this.pressureMaterial.dispose();
    this.gradientMaterial.dispose();
    this.dyeMaterial.dispose();
    this.displayMaterial.dispose();

    this.quad.geometry.dispose();
  }
}
