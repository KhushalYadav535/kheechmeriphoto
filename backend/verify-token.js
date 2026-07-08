const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

async function checkToken() {
  const token = process.env.HF_API_KEY;
  console.log("Token length:", token ? token.length : 0);
  
  const res = await fetch('https://huggingface.co/api/whoami-v2', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log("✅ Token is valid! User:", data.name);
  } else {
    console.log("❌ Token is invalid:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response:", text);
  }
}

checkToken();
