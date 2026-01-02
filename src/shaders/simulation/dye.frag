precision highp float;

uniform sampler2D dyeTexture;
uniform vec2 point;
uniform vec3 color;
uniform float radius;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  vec3 currentDye = texture2D(dyeTexture, vUv).rgb;

  // Distance from interaction point
  vec2 diff = vUv - point;
  diff.x *= texelSize.y / texelSize.x; // Correct for aspect ratio

  float dist = length(diff);

  // Gaussian splat for smooth dye application
  float influence = exp(-dist * dist / (radius * radius));

  // Add color with smooth falloff
  vec3 addedDye = color * influence;

  gl_FragColor = vec4(currentDye + addedDye, 1.0);
}
