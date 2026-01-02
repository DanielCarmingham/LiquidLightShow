precision highp float;

#include ../common/noise.glsl
#include ../common/utils.glsl

uniform sampler2D velocityTexture;
uniform sampler2D dyeTexture;
uniform float time;
uniform float filmThickness;
uniform float colorIntensity;
uniform int palette;
uniform vec3 audioReactivity; // bass, mids, highs

varying vec2 vUv;

// Thin-film interference simulation
vec3 thinFilmInterference(float thickness) {
  // Phase shift based on optical path difference
  float phase = thickness * 6.28318 * 2.5;

  // RGB wavelengths create interference pattern (rainbow effect)
  return vec3(
    0.5 + 0.5 * cos(phase),
    0.5 + 0.5 * cos(phase - 2.094),  // 120 degree offset
    0.5 + 0.5 * cos(phase - 4.189)   // 240 degree offset
  );
}

// Color palette functions
vec3 palette0(float t) {
  // Classic psychedelic rainbow
  return vec3(
    0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
    0.5 + 0.5 * cos(6.28318 * (t + 0.33)),
    0.5 + 0.5 * cos(6.28318 * (t + 0.67))
  );
}

vec3 palette1(float t) {
  // Warm sunset
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.3);
  vec3 c = vec3(1.0, 0.7, 0.4);
  vec3 d = vec3(0.0, 0.15, 0.2);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette2(float t) {
  // Cool ocean
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(0.8, 0.8, 0.5);
  vec3 d = vec3(0.0, 0.2, 0.5);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette3(float t) {
  // Neon pink/purple
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.8, 0.9, 0.3);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette4(float t) {
  // Fire/lava
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.4);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.0, 0.1, 0.2);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette5(float t) {
  // Aurora borealis
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 0.7, 0.4);
  vec3 d = vec3(0.0, 0.5, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette6(float t) {
  // Deep space
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.3, 0.5);
  vec3 c = vec3(0.5, 0.5, 0.5);
  vec3 d = vec3(0.5, 0.5, 0.5);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette7(float t) {
  // Toxic/acid
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(0.5, 1.0, 0.5);
  vec3 d = vec3(0.3, 0.0, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette8(float t) {
  // Monochrome with subtle hue
  float v = 0.5 + 0.5 * cos(6.28318 * t);
  return vec3(v * 0.9, v * 0.95, v);
}

vec3 getPaletteColor(float t, int p) {
  if (p == 0) return palette0(t);
  if (p == 1) return palette1(t);
  if (p == 2) return palette2(t);
  if (p == 3) return palette3(t);
  if (p == 4) return palette4(t);
  if (p == 5) return palette5(t);
  if (p == 6) return palette6(t);
  if (p == 7) return palette7(t);
  return palette8(t);
}

void main() {
  // Get fluid velocity
  vec2 velocity = texture2D(velocityTexture, vUv).xy;
  float speed = length(velocity);

  // Get dye color (accumulated from interactions)
  vec3 dye = texture2D(dyeTexture, vUv).rgb;

  // Create organic thickness variation using noise
  float noiseScale = 3.0 + audioReactivity.z * 2.0; // Highs add detail
  float timeOffset = time * 0.05;
  float thickness = fbm(vUv * noiseScale + timeOffset, 5);

  // Add velocity influence on thickness
  thickness += speed * 0.5;

  // Audio bass adds turbulence to thickness
  thickness += audioReactivity.x * 0.3 * snoise(vUv * 8.0 + time * 0.2);

  // Scale by film thickness parameter
  thickness *= filmThickness;

  // Get thin-film iridescence colors
  vec3 iridescence = thinFilmInterference(thickness);

  // Get palette color based on position and time
  float paletteSample = thickness + time * 0.02 + speed * 0.3;
  vec3 paletteColor = getPaletteColor(paletteSample, palette);

  // Blend iridescence with palette
  vec3 color = mix(iridescence, paletteColor, 0.5);

  // Add dye colors
  color = mix(color, dye, clamp(length(dye) * 0.5, 0.0, 0.5));

  // Audio mids affect color intensity/saturation
  float satBoost = 1.0 + audioReactivity.y * 0.5;
  vec3 hsv = rgb2hsv(color);
  hsv.y *= satBoost;
  color = hsv2rgb(hsv);

  // Apply overall intensity
  color *= colorIntensity;

  // Subtle vignette
  vec2 vignetteUv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vignetteUv, vignetteUv) * 0.2;
  color *= vignette;

  // Add subtle glow based on speed
  color += vec3(0.1, 0.05, 0.15) * speed * 2.0;

  // Audio highs add sparkle
  float sparkle = snoise(vUv * 50.0 + time * 2.0);
  sparkle = smoothstep(0.7, 1.0, sparkle) * audioReactivity.z;
  color += vec3(1.0) * sparkle * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
