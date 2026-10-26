precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float amt;
uniform float uTime;
uniform float uIntensity;
uniform float uBlend;

vec3 aquaticViolet(vec2 uv) {
  vec3 c0 = vec3(0.035, 0.059, 0.188); // #090F30
  vec3 c1 = vec3(0.20, 0.125, 0.373);  // #33205F
  vec3 c2 = vec3(0.267, 0.31, 0.639);  // #444FA3
  vec3 c3 = vec3(0.40, 0.20, 0.68);    // violeta acuático
  vec3 c4 = vec3(0.725, 0.871, 0.965); // #B9DEF6
  float p = clamp(uv.y + sin(uv.x * 4.0 + uTime * 0.12) * 0.08, 0.0, 1.0);
  vec3 gradient = p < 0.25 ? mix(c0, c1, p / 0.25) :
         p < 0.5 ? mix(c1, c2, (p - 0.25) / 0.25) :
         p < 0.75 ? mix(c2, c3, (p - 0.5) / 0.25) :
         mix(c3, c4, (p - 0.75) / 0.25);
  // Agua animada en la franja inferior: ondas superpuestas + reflejos.
  float waterMask = smoothstep(0.72, 0.34, uv.y);
  float waveA = sin(uv.x * 28.0 + uTime * 1.4 + sin(uv.y * 9.0) * 2.0);
  float waveB = sin(uv.x * 53.0 - uTime * 1.1 + uv.y * 17.0);
  float ripples = 0.5 + 0.5 * (waveA * 0.65 + waveB * 0.35);
  vec3 waterColor = mix(vec3(0.035, 0.10, 0.27), vec3(0.10, 0.52, 0.68), ripples);
  float reflection = pow(max(0.0, sin(uv.x * 42.0 + uTime * 0.7 + uv.y * 12.0)), 18.0) * 0.24;
  waterColor += vec3(0.20, 0.62, 0.78) * reflection;
  return mix(gradient, waterColor, waterMask * 0.82);
}

void main() {
  vec2 uv = 1.0 - vTexCoord;
  vec4 cam = texture2D(tex0, uv);
  float avg = dot(cam.rgb, vec3(0.33333));
  avg = avg * 2.0 - 1.0;
  float disp = avg * amt;
  // Campo líquido adicional, inspirado en la primera experiencia:
  // se suma al displacement de cámara y afecta también el fondo acuático.
  vec2 organic;
  organic.x = sin(uv.x * 8.0 + sin(uv.y * 5.0 + uTime * 0.55) * 1.8 + uTime * 0.42);
  organic.y = cos(uv.y * 10.0 - sin(uv.x * 4.0 - uTime * 0.38) * 1.6 + uTime * 0.34);
  organic *= 0.018 * uIntensity;
  vec2 displacedUv = uv + vec2(disp) + organic;
  vec2 chromeUv = displacedUv + vec2(sin(uv.y * 16.0 + uTime * 0.6), cos(uv.x * 13.0 - uTime * 0.45)) * 0.012 * uIntensity;
  float chromatic = 0.006 * uIntensity;
  vec3 color = vec3(
    texture2D(tex0, chromeUv + vec2(chromatic, 0.0)).r,
    texture2D(tex0, chromeUv).g,
    texture2D(tex0, chromeUv - vec2(chromatic, 0.0)).b
  );
  vec3 original = texture2D(tex0, uv).rgb;
  color = mix(color, original, uBlend);
  float chromeWave = 0.5 + 0.5 * sin((uv.x + uv.y) * 18.0 + sin(uv.y * 7.0 + uTime * 0.7) * 2.0);
  color += vec3(0.55, 0.78, 1.0) * pow(chromeWave, 10.0) * 0.35 * uIntensity;
  color += vec3(0.28, 0.10, 0.55) * pow(1.0 - chromeWave, 14.0) * 0.16 * uIntensity;
  // Light rays volumétricos por encima de toda la composición.
  // Valores fijos copiados de la referencia Light Rays.
  const float raySpeed = 1.0;
  const float lightSpread = 0.5;
  const float rayLength = 3.0;
  const float rayDensity = 1.0;
  const float tilt = 0.0;
  const float raySharpness = 0.35;
  const float rayGlow = 0.6;
  const float haze = 0.25;
  const float atmosphere = 1.0;
  const float rayIntensity = 1.0;
  vec2 source = vec2(0.50 + tilt * 0.28, 1.08);
  vec2 rayVector = uv - source;
  float angle = atan(rayVector.x, -rayVector.y);
  float distanceFromSource = length(rayVector);
  float rayFan = pow(max(0.0, cos(angle * (5.0 + rayDensity * 7.0) * lightSpread + sin(uv.y * 5.0 + uTime * 0.20 * raySpeed) * 0.45)), 2.0 + raySharpness * 30.0);
  float rayBreakup = 0.72 + 0.28 * sin(uv.x * 13.0 - uv.y * 8.0 + uTime * 0.28 * raySpeed);
  float rays = rayFan * rayBreakup * smoothstep(rayLength, 0.08, distanceFromSource) * 0.22 * rayIntensity;
  float glow = exp(-distanceFromSource * (3.0 + haze * 8.0)) * 0.16 * rayGlow;
  color += vec3(1.0) * rays * atmosphere;
  color += vec3(1.0) * glow;
  gl_FragColor = vec4(color, 1.0);
}
