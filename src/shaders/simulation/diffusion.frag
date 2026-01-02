precision highp float;

uniform sampler2D velocityTexture;
uniform float viscosity;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  // Jacobi iteration for diffusion
  vec4 center = texture2D(velocityTexture, vUv);
  vec4 left = texture2D(velocityTexture, vUv - vec2(texelSize.x, 0.0));
  vec4 right = texture2D(velocityTexture, vUv + vec2(texelSize.x, 0.0));
  vec4 top = texture2D(velocityTexture, vUv + vec2(0.0, texelSize.y));
  vec4 bottom = texture2D(velocityTexture, vUv - vec2(0.0, texelSize.y));

  // Diffusion coefficient
  float alpha = texelSize.x * texelSize.x / (viscosity * 0.016);
  float rBeta = 1.0 / (4.0 + alpha);

  // Jacobi solver step
  vec4 result = (left + right + top + bottom + alpha * center) * rBeta;

  gl_FragColor = result;
}
