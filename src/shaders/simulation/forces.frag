precision highp float;

uniform sampler2D velocityTexture;
uniform vec2 point;
uniform vec2 force;
uniform float radius;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  vec2 currentVelocity = texture2D(velocityTexture, vUv).xy;

  // Distance from interaction point
  vec2 diff = vUv - point;
  diff.x *= texelSize.y / texelSize.x; // Correct for aspect ratio

  float dist = length(diff);

  // Gaussian splat for smooth force application
  float influence = exp(-dist * dist / (radius * radius));

  // Add force with smooth falloff
  vec2 addedVelocity = force * influence;

  gl_FragColor = vec4(currentVelocity + addedVelocity, 0.0, 1.0);
}
