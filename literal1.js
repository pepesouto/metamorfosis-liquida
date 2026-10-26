let camShader, cam, amount, intensity, speed, blend;

function preload() {
  camShader = loadShader('literal1.vert', 'literal1.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  cam = createCapture(VIDEO);
  cam.size(windowWidth, windowHeight);
  cam.hide();
  amount = createSlider(0, 0.2, 0.1, 0.001);
  amount.position(20, 20);
  amount.style('width', '180px');
  intensity = createSlider(0, 1.4, 0.65, 0.01); intensity.position(20, 50); intensity.style('width', '180px');
  speed = createSlider(0, 1.5, 0.42, 0.01); speed.position(20, 80); speed.style('width', '180px');
  blend = createSlider(0, 1, 0.18, 0.01); blend.position(20, 110); blend.style('width', '180px');
}

function draw() {
  shader(camShader);
  camShader.setUniform('tex0', cam);
  camShader.setUniform('amt', amount.value());
  camShader.setUniform('uTime', millis() * 0.001 * speed.value());
  camShader.setUniform('uIntensity', intensity.value());
  camShader.setUniform('uBlend', blend.value());
  rect(0, 0, width, height);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
