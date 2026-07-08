const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const captureBtn = document.getElementById('capture');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-upload');
const retakeBtn = document.getElementById('retake');
const generateBtn = document.getElementById('generate');
const resultDiv = document.getElementById('result');
const caricatureImg = document.getElementById('caricature');

let capturedDataUrl = null;
let stream = null;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
  } catch (e) {
    console.error(e);
    alert("Camera access failed. Try uploading an image instead.");
  }
}

captureBtn.addEventListener('click', () => {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  capturedDataUrl = canvas.toDataURL('image/png');
  preview.src = capturedDataUrl;
  preview.classList.remove('hidden');
  enableGenerate();
});

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      capturedDataUrl = ev.target.result;
      preview.src = capturedDataUrl;
      preview.classList.remove('hidden');
      enableGenerate();
    };
    reader.readAsDataURL(file);
  }
});

function enableGenerate() {
  generateBtn.disabled = false;
  retakeBtn.classList.remove('hidden');
}

retakeBtn.addEventListener('click', () => {
  preview.classList.add('hidden');
  generateBtn.disabled = true;
  retakeBtn.classList.add('hidden');
});

generateBtn.addEventListener('click', async () => {
  if (!capturedDataUrl) return;

  generateBtn.disabled = true;
  generateBtn.innerHTML = '🤖 Generating with Grok...';

  const hobbies = document.getElementById('hobbies').value.trim();
  const futurePlans = document.getElementById('future').value.trim();

  try {
    const formData = new FormData();
    const blob = await fetch(capturedDataUrl).then(r => r.blob());
    formData.append('photo', blob, 'selfie.png');
    if (hobbies) formData.append('hobbies', hobbies);
    if (futurePlans) formData.append('futurePlans', futurePlans);

    const res = await fetch('http://localhost:3000/generate-caricature', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      caricatureImg.src = data.image;
      resultDiv.classList.remove('hidden');
      resultDiv.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert(data.error || 'Generation failed');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    generateBtn.innerHTML = '✨ Generate My Funny Caricature';
    generateBtn.disabled = false;
  }
});

function downloadCaricature() {
  const link = document.createElement('a');
  link.href = caricatureImg.src;
  link.download = `my-caricature-${Date.now()}.png`;
  link.click();
}

// Init
window.onload = () => {
  startCamera();
};