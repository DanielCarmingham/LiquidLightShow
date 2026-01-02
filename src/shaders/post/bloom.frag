precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 direction;
uniform vec2 resolution;
uniform float intensity;

varying vec2 vUv;

// 9-tap Gaussian blur weights
const float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec2 texelSize = 1.0 / resolution;
  vec3 result = texture2D(tDiffuse, vUv).rgb * weights[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = direction * texelSize * float(i) * 2.0;
    result += texture2D(tDiffuse, vUv + offset).rgb * weights[i];
    result += texture2D(tDiffuse, vUv - offset).rgb * weights[i];
  }

  gl_FragColor = vec4(result * intensity, 1.0);
}
