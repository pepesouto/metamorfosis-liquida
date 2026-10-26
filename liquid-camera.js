const video = document.getElementById('camera');
const start = document.getElementById('start');
const chrome = document.querySelector('.chrome');

async function activateCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
    video.srcObject = stream; start.textContent='Cámara activa'; start.disabled=true;
  }catch(error){ start.textContent='Permiso de cámara requerido'; console.error(error); }
}
start.addEventListener('click',activateCamera);
function move(e){
  const r=chrome.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
  chrome.style.setProperty('--mx',`${x*100}%`); chrome.style.setProperty('--my',`${y*100}%`);
  chrome.style.setProperty('--ry',`${(x-.5)*10}deg`); chrome.style.setProperty('--rx',`${(.5-y)*8}deg`);
}
chrome.addEventListener('pointerenter',()=>chrome.classList.add('active'));
chrome.addEventListener('pointerleave',()=>{chrome.classList.remove('active');chrome.style.setProperty('--rx','0deg');chrome.style.setProperty('--ry','0deg')});
chrome.addEventListener('pointermove',move);
chrome.addEventListener('pointerdown',()=>chrome.classList.add('active'));
chrome.addEventListener('pointerup',()=>chrome.classList.remove('active'));
