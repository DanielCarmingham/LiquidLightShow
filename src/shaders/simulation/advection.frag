precision highp float;

uniform sampler2D velocityTexture;
uniform sampler2D sourceTexture;
uniform float deltaTime;
uniform float dissipation;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  // Semi-Lagrangian advection: trace backwards along velocity
  vec2 velocity = texture2D(velocityTexture, vUv).xy;

  // Scale velocity by time step and texel size
  vec2 pos = vUv - velocity * deltaTime * texelSize;

  // Sample from the back-traced position with bilinear interpolation
  vec4 result = texture2D(sourceTexture, pos);

  // Apply dissipation to gradually reduce values over time
  result *= dissipation;

  gl_FragColor = result;
}
