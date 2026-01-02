precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float bloomStrength;

varying vec2 vUv;

void main() {
  vec3 base = texture2D(tDiffuse, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;

  // Additive blend with bloom
  vec3 result = base + bloom * bloomStrength;

  // Tone mapping (simple Reinhard)
  result = result / (result + vec3(1.0));

  // Gamma correction
  result = pow(result, vec3(1.0 / 2.2));

  gl_FragColor = vec4(result, 1.0);
}
