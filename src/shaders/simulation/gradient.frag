precision highp float;

uniform sampler2D pressureTexture;
uniform sampler2D velocityTexture;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  // Subtract pressure gradient from velocity to get divergence-free field
  float left = texture2D(pressureTexture, vUv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(pressureTexture, vUv + vec2(texelSize.x, 0.0)).x;
  float top = texture2D(pressureTexture, vUv + vec2(0.0, texelSize.y)).x;
  float bottom = texture2D(pressureTexture, vUv - vec2(0.0, texelSize.y)).x;

  vec2 velocity = texture2D(velocityTexture, vUv).xy;
  vec2 gradient = vec2(right - left, top - bottom) * 0.5;

  velocity -= gradient;

  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
