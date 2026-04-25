"use client";

import { useState, useRef, useEffect } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function GlaciaAssistant() {
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const statusRef = useRef(status);

  // Sync ref with state so async callbacks always see the "now" status
  const updateStatus = (newStatus: typeof status) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  };

  // Initialize Speech Recognition once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => updateStatus("listening");

    recognition.onresult = async (event: any) => {
      const isFinal = event.results[0].isFinal;
      const text = event.results[0][0].transcript;
      setTranscript(text);

      if (isFinal) {
        // Stop listening while we talk to the backend
        recognition.abort(); 
        updateStatus("processing");

        try {
          const response = await fetch("https://glacialabs.app.n8n.cloud/webhook/glacia-assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatInput: text, sessionId: "glacia_stable_session" }),
          });

          if (!response.ok) throw new Error("Backend Error");

          const audioBlob = await response.blob();
          const url = URL.createObjectURL(audioBlob);
          const audio = new Audio(url);
          audioRef.current = audio;

          updateStatus("speaking");
          
          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            // Give the OS 500ms to switch from speaker back to mic
            setTimeout(() => {
              if (statusRef.current === "speaking") startListening();
            }, 500);
          };

          await audio.play();

        } catch (error) {
          console.error("AI Error:", error);
          updateStatus("idle");
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.log("Recognition Error:", e.error);
      // If it times out or fails while listening, restart it
      if (statusRef.current === "listening") {
        setTimeout(startListening, 300);
      }
    };

    recognition.onend = () => {
      // Logic: If we are supposed to be listening but the mic closed itself (timeout), restart.
      if (statusRef.current === "listening") {
        startListening();
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Usually means it's already running, which is fine
    }
  };

  const initAssistant = () => {
    setTranscript("");
    updateStatus("listening");
    startListening();
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 selection:bg-emerald-500/30">
      <div className="max-w-md w-full text-center space-y-12">
        
        <div className="space-y-4">
          <h1 className="text-white text-[10px] tracking-[0.8em] uppercase font-bold opacity-40">
            Glacia Labs
          </h1>
          <p className="text-zinc-500 font-serif italic text-xl h-8 transition-all">
            {status === "listening" ? "I'm listening..." : 
             status === "processing" ? "Consulting AI..." : 
             status === "speaking" ? "Responding..." : 
             "Tap to Initialize"}
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Animated Background Ring */}
          {status !== "idle" && (
            <div className={`absolute inset-0 rounded-full animate-ping opacity-10 duration-1000 ${
              status === "listening" ? "bg-rose-500" : "bg-emerald-500"
            }`}></div>
          )}

          <button
            onClick={() => status === "idle" && initAssistant()}
            disabled={status === "processing"}
            className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center border transition-all duration-700 ${
              status === "listening" ? "bg-rose-950/20 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.1)] scale-110" :
              status === "speaking" ? "bg-emerald-950/20 border-emerald-500/30" :
              "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex gap-1.5 items-center">
              <div className={`w-0.5 bg-white transition-all duration-500 ${status === 'listening' ? 'h-8 animate-pulse' : 'h-2'}`}></div>
              <div className={`w-0.5 bg-white transition-all duration-500 ${status === 'listening' ? 'h-12 animate-pulse delay-75' : 'h-4'}`}></div>
              <div className={`w-0.5 bg-white transition-all duration-500 ${status === 'listening' ? 'h-8 animate-pulse delay-150' : 'h-2'}`}></div>
            </div>
          </button>
        </div>

        <div className="min-h-[60px] px-4">
          <p className="text-zinc-400 text-sm font-light italic leading-relaxed">
            {transcript ? `"${transcript}"` : "Tap the sphere and speak clearly."}
          </p>
        </div>
      </div>
    </main>
  );
}