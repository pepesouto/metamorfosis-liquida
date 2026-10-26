let shaderProgram;
let sourceImage;
let imageAspect = 1.5;
let camera;
const gradientMode = new URLSearchParams(location.search).has('gradient');
let settings = { intensity: 0.65, displacement: 0.55, speed: 0.42, blend: 0.18 };

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.parent('canvas-root');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  shaderProgram = createShader(
    document.querySelector('#vertex-shader').textContent,
    document.querySelector('#fragment-shader').textContent
  );
  sourceImage = createGraphics(1200, 800);
  drawTestImage(sourceImage);
  document.getElementById('cameraButton').addEventListener('click', startCamera);
  document.getElementById('variantButton').addEventListener('click', () => {
    location.href = gradientMode ? 'index.html' : 'index.html?gradient=1';
  });
  document.getElementById('referenceButton').addEventListener('click', () => {
    window.open('https://aferriss.github.io/p5jsShaderExamples/4_image-effects/4-7_displacement-map/', '_blank', 'noopener');
  });
  if (gradientMode) {
    document.getElementById('modeHint').textContent = 'Degradé procedural · paleta deep · agua en movimiento';
    document.getElementById('variantButton').textContent = 'Volver a cámara';
    document.getElementById('cameraButton').style.display = 'block';
  }
  noStroke();
  bindControl('intensity'); bindControl('displacement'); bindControl('speed'); bindControl('blend');
}

function draw() {
  shader(shaderProgram);
  shaderProgram.setUniform('uImage', camera || sourceImage);
  shaderProgram.setUniform('uImageAspect', imageAspect);
  shaderProgram.setUniform('uCameraMode', camera ? 1 : 0);
  shaderProgram.setUniform('uGradientMode', gradientMode ? 1 : 0);
  shaderProgram.setUniform('uDisplacement', settings.displacement);
  shaderProgram.setUniform('uResolution', [width * pixelDensity(), height * pixelDensity()]);
  shaderProgram.setUniform('uTime', millis() * 0.001 * settings.speed);
  shaderProgram.setUniform('uIntensity', settings.intensity);
  shaderProgram.setUniform('uBlend', settings.blend);
  plane(width, height);
}

function bindControl(id) {
  const input = document.getElementById(id);
  const output = document.getElementById(`${id}Value`);
  input.addEventListener('input', () => { settings[id] = Number(input.value); output.value = Number(input.value).toFixed(2); });
}

function startCamera() {
  if (camera) return;
  const button = document.getElementById('cameraButton');
  button.textContent = 'Solicitando cámara…';
  camera = createCapture({ video: { facingMode: 'user' }, audio: false }, () => {
    camera.hide();
    imageAspect = camera.width / camera.height || 1.5;
    button.textContent = 'Cámara activa';
    button.disabled = true;
  });
  camera.elt.setAttribute('playsinline', '');
}

function drawTestImage(g) {
  g.noStroke();
  for (let y = 0; y < g.height; y++) {
    const c = lerpColor(color('#082027'), color('#d1a76f'), y / g.height);
    g.fill(c); g.rect(0, y, g.width, 1);
  }
  g.fill(8, 31, 34, 150); g.ellipse(260, 220, 520, 520);
  g.fill('#d6b578'); g.ellipse(860, 310, 420, 560);
  g.fill('#0b3031'); g.ellipse(700, 760, 900, 620);
  g.fill('#e8d6a9'); g.ellipse(1050, 100, 340, 340);
  g.fill(255, 255, 255, 36); g.ellipse(780, 330, 170, 380);
  g.fill(255, 255, 255, 24); g.ellipse(310, 190, 120, 250);
  g.stroke(255, 245, 210, 110); g.strokeWeight(3);
  for (let i = 0; i < 7; i++) { g.line(80 + i * 170, 800, 320 + i * 160, 0); }
  g.noStroke();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
