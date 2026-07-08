const express = require('express');
const multer = require('multer');
const cors = require('cors');
// Removed fal.ai client
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = ['https://kheechmeriphoto.vercel.app', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });

// Configure OpenRouter API Key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Warning: Valid OPENROUTER_API_KEY not set in .env');
}

app.post('/generate-caricature', upload.single('photo'), async (req, res) => {
  try {
    const { hobbies, futurePlans } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No photo provided' });

    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const prompt = `Create an extremely funny, wildly exaggerated caricature of the person in the photo. 
    Make the facial features highly comical and exaggerated—like a noticeably larger nose, big eyes, and a cartoonish big head.
    Incorporate their hobbies: ${hobbies || 'fun activities'}. 
    Include their near-future plans: ${futurePlans || 'exciting adventures'}. 
    Blend in humorous elements from hobbies and dreams. 
    Vibrant cartoon style, high energy, light-hearted and hilarious.`;

    // Convert to data URI for Vision Model
    const base64Input = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Input}`;

    // Step 1: Call OpenRouter Vision API to analyze the face
    console.log("Analyzing face with OpenRouter Vision model...");
    const visionResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Fast multimodal model
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe the facial features, hair style, and expression of this person in extreme detail. Focus only on the person's face and head. Limit to 3 sentences." },
              { type: "image_url", image_url: { url: dataUri } }
            ]
          }
        ]
      })
    });

    const visionData = await visionResponse.json();
    if (!visionResponse.ok) {
      throw new Error("Vision API Error: " + (visionData.error?.message || JSON.stringify(visionData)));
    }
    const faceDescription = visionData.choices?.[0]?.message?.content || "A person with unique features";
    console.log("Face description:", faceDescription);

    // Step 2: Call OpenRouter Image API to generate the caricature
    console.log("Generating caricature with OpenRouter Image API...");
    const imagePrompt = `Create an extremely funny, wildly exaggerated caricature. ${faceDescription}. 
    Make the facial features highly comical and exaggerated—like a noticeably larger nose, big eyes, and a cartoonish big head.
    Incorporate their hobbies: ${hobbies || 'fun activities'}. 
    Include their near-future plans: ${futurePlans || 'exciting adventures'}. 
    Blend in humorous elements from hobbies and dreams. 
    Vibrant cartoon style, high energy, light-hearted and hilarious.`;

    const imageResponse = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image", // Good image generation model available on OpenRouter
        prompt: imagePrompt,
        n: 1
      })
    });

    const imageData = await imageResponse.json();
    if (!imageResponse.ok) {
      throw new Error("Image API Error: " + (imageData.error?.message || JSON.stringify(imageData)));
    }

    console.log("OpenRouter Image API success.");
    
    // Cleanup upload
    fs.unlinkSync(imagePath);

    // Extract the generated image URL
    const finalImageUri = imageData.data && imageData.data.length > 0 
      ? (imageData.data[0].url || imageData.data[0].b64_json) 
      : null;

    if (!finalImageUri) {
      throw new Error("No image returned from OpenRouter API");
    }

    // Handle base64 response if URL is not provided
    const imageResult = finalImageUri.startsWith('http') ? finalImageUri : `data:image/jpeg;base64,${finalImageUri}`;

    res.json({ 
      success: true, 
      image: imageResult,
      message: "Caricature generated successfully!"
    });
  } catch (error) {
    console.error("Error from OpenRouter API:", error.message || error);
    res.status(500).json({ error: 'Failed to generate caricature. Check API key balance and try again.' });
  }
});

app.get('/', (req, res) => {
  res.send('Caricature SaaS Backend is running! Use /generate-caricature endpoint.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
