precision highp float;

uniform sampler2D pressureTexture;
uniform sampler2D divergenceTexture;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  // Jacobi iteration for pressure solve
  float left = texture2D(pressureTexture, vUv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(pressureTexture, vUv + vec2(texelSize.x, 0.0)).x;
  float top = texture2D(pressureTexture, vUv + vec2(0.0, texelSize.y)).x;
  float bottom = texture2D(pressureTexture, vUv - vec2(0.0, texelSize.y)).x;
  float divergence = texture2D(divergenceTexture, vUv).x;

  float pressure = (left + right + top + bottom - divergence) * 0.25;

  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
