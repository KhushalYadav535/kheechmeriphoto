"use client";

import { useEffect, useRef, useState } from "react";

const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio error", e);
  }
};

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [hobbies, setHobbies] = useState("");
  const [futurePlans, setFuturePlans] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [loadingText, setLoadingText] = useState("");
  const [caricatureResult, setCaricatureResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Store stream in a ref so cleanup can access the latest stream even during rapid re-renders
  const streamRef = useRef(null);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        
        if (!active) {
          // If the component unmounted while waiting for camera, stop it immediately
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        
        streamRef.current = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (e) {
        if (!active) return;
        console.error(e);
        if (e.name === "NotReadableError") {
          setErrorMsg("Camera is in use by another application. Please close other apps or use the 'Upload Image' option.");
        } else {
          setErrorMsg("Camera access failed. Please try uploading an image instead.");
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      
      // Mirror the canvas to match the mirrored video element
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedDataUrl(dataUrl);
      setCaricatureResult(null);
      setErrorMsg("");
    }
  };

  const handleUploadBtnClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedDataUrl(ev.target.result);
        setCaricatureResult(null);
        setErrorMsg("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCaricatureResult(null);
    setErrorMsg("");
  };

  const handleGenerate = async () => {
    if (!capturedDataUrl) return;

    setLoading(true);
    setErrorMsg("");
    setCaricatureResult(null);

    let currentCount = 20;
    setCountdown(currentCount);
    setLoadingText("Analyzing your majestic face...");

    const timer = setInterval(() => {
      currentCount--;
      if (currentCount === 15) setLoadingText("Exaggerating your features...");
      if (currentCount === 10) setLoadingText("Adding humorous details...");
      if (currentCount === 5) setLoadingText("Applying final colors...");
      if (currentCount <= 0) {
        setLoadingText("Just a moment longer...");
        currentCount = 0;
      }
      setCountdown(currentCount);
    }, 1000);

    try {
      const formData = new FormData();
      const blob = await fetch(capturedDataUrl).then((r) => r.blob());
      formData.append("photo", blob, "selfie.png");
      if (hobbies.trim()) formData.append("hobbies", hobbies.trim());
      if (futurePlans.trim()) formData.append("futurePlans", futurePlans.trim());

      // Use the environment variable if set, otherwise fallback to the live deployed backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://khecchmeribackend.onrender.com";
      
      const res = await fetch(`${backendUrl}/generate-caricature`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        playSuccessSound();
        setCaricatureResult(data.image);
        // Scroll to bottom smoothly
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 100);
      } else {
        setErrorMsg(data.error || "Generation failed");
      }
    } catch (err) {
      setErrorMsg("Error: " + err.message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (caricatureResult) {
      const link = document.createElement("a");
      link.href = caricatureResult;
      link.download = `my-caricature-${Date.now()}.png`;
      link.click();
    }
  };

  const handleTryAnother = () => {
    setCapturedDataUrl(null);
    setCaricatureResult(null);
    setHobbies("");
    setFuturePlans("");
    setErrorMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 relative">
      
      {/* Full-screen Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative flex flex-col items-center justify-center p-10 bg-gray-900 border border-gray-700 rounded-[2rem] shadow-[0_0_50px_rgba(168,85,247,0.3)] max-w-md w-full mx-4 text-center">
            
            {/* Spinning Loader Rings */}
            <div className="relative w-36 h-36 mb-8">
              <div className="absolute inset-0 rounded-full border-t-4 border-purple-500 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-b-4 border-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
              <div className="absolute inset-8 rounded-full border-l-4 border-blue-500 animate-spin" style={{ animationDuration: '0.8s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl">
                🎨
              </div>
            </div>

            <h3 className="text-5xl font-black bg-gradient-to-br from-purple-400 to-pink-500 bg-clip-text text-transparent mb-6 tracking-wider">
              {countdown > 0 ? `00:${countdown.toString().padStart(2, '0')}` : "00:00"}
            </h3>
            
            <p className="text-xl text-gray-200 font-medium animate-pulse">
              {loadingText}
            </p>
          </div>
          
          {/* Powered by DataTrack branding below loader */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 font-medium tracking-wide">
            <span>Powered by</span>
            <span className="text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">DataTrack</span>
          </div>
        </div>
      )}

      <header className="text-center py-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          🎨 Be a Caricature of Your Own
        </h1>
        <p className="mt-3 text-xl text-gray-400">
          Snap → Share Hobbies → Get Your Hilarious Future Self
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400 font-medium tracking-wide">
          <span>An initiative by</span>
          <span className="text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">DataTrack</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Webcam Section */}
        <div className="bg-gray-900 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6">📸 Step 1: Capture Your Selfie</h2>
          
          <video
            ref={videoRef}
            className="w-full rounded-2xl bg-black aspect-video object-cover scale-x-[-1]"
            autoPlay
            playsInline
            muted
          ></video>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleCapture}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold text-lg transition-colors"
            >
              📸 Capture
            </button>
            <button
              onClick={handleUploadBtnClick}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-semibold text-lg transition-colors"
            >
              📤 Upload Image
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {capturedDataUrl && (
            <button
              onClick={handleRetake}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 py-3 rounded-2xl transition-colors"
            >
              ↺ Retake
            </button>
          )}
        </div>

        {/* Preview + Inputs Section */}
        <div className="bg-gray-900 rounded-3xl p-8 flex flex-col">
          <h2 className="text-2xl font-semibold mb-4">Your Photo</h2>
          
          <div className="bg-gray-800 rounded-2xl flex-1 flex items-center justify-center min-h-[200px] overflow-hidden">
            {capturedDataUrl ? (
              <img
                src={capturedDataUrl}
                className="w-full h-full object-cover"
                alt="Preview"
              />
            ) : (
              <span className="text-gray-500">No image captured</span>
            )}
          </div>
          
          {/* Hidden Canvas for Drawing Video Frame */}
          <canvas ref={canvasRef} className="hidden"></canvas>

          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Hobbies & Interests</label>
              <input
                type="text"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="gaming, hiking, music..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Near Future Plans</label>
              <textarea
                rows={3}
                value={futurePlans}
                onChange={(e) => setFuturePlans(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500 resize-y transition-colors"
                placeholder="Travel to Japan, launch startup..."
              ></textarea>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!capturedDataUrl || loading}
            className={`w-full mt-8 py-5 rounded-3xl text-xl font-bold transition-all ${
              !capturedDataUrl || loading
                ? "opacity-50 cursor-not-allowed bg-gray-700"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            }`}
          >
            {loading ? "🤖 Generating..." : "✨ Generate My Funny Caricature"}
          </button>
          
          {errorMsg && <p className="text-red-400 text-center mt-4">{errorMsg}</p>}
        </div>
      </div>

      {/* Result Section */}
      {caricatureResult && (
        <div className="mt-12 bg-gradient-to-br from-gray-900 to-purple-950 rounded-3xl p-10 text-center shadow-2xl animate-in fade-in zoom-in duration-500">
          <h2 className="text-4xl font-bold mb-8">🎉 Your Personalized Caricature!</h2>
          <img
            src={caricatureResult}
            className="max-h-[500px] mx-auto rounded-3xl shadow-2xl border-4 border-purple-500 object-cover"
            alt="Your Caricature"
          />

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <button
              onClick={handleDownload}
              className="flex-1 bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-semibold text-lg transition-colors max-w-sm"
            >
              ⬇️ Download HD
            </button>
            <button
              onClick={handleTryAnother}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-semibold text-lg transition-colors max-w-sm"
            >
              Try Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
