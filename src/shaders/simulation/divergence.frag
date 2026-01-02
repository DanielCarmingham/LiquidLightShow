precision highp float;

uniform sampler2D velocityTexture;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  // Calculate divergence of velocity field
  float left = texture2D(velocityTexture, vUv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(velocityTexture, vUv + vec2(texelSize.x, 0.0)).x;
  float top = texture2D(velocityTexture, vUv + vec2(0.0, texelSize.y)).y;
  float bottom = texture2D(velocityTexture, vUv - vec2(0.0, texelSize.y)).y;

  float divergence = 0.5 * ((right - left) + (top - bottom));

  gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
}
