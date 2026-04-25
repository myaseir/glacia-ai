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
  
  // Refs for managing side effects without re-renders
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const startAssistant = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = false; 
    recognition.interimResults = true; // Essential for fast interruption

    recognition.onstart = () => setStatus("listening");

    // --- INTERRUPTION LOGIC ---
    recognition.onspeechstart = () => {
      if (audioRef.current && !audioRef.current.paused) {
        console.log("User interrupted AI. Stopping playback.");
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setStatus("listening");
      }
    };

    recognition.onresult = async (event: any) => {
      const isFinal = event.results[0].isFinal;
      const text = event.results[0][0].transcript;
      setTranscript(text);

      if (isFinal) {
        recognition.stop(); // Stop mic while processing
        setStatus("processing");

        try {
          const response = await fetch("https://glacialabs.app.n8n.cloud/webhook/glacia-assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              chatInput: text, 
              sessionId: "glacia_barge_in_session" 
            }),
          });

          if (!response.ok) throw new Error("n8n error");

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          setStatus("speaking");
          await audio.play();

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            // Loop back to listen automatically
            startAssistant(); 
          };

          // To allow interruption while the AI is speaking, 
          // we need to keep the mic listening in the background
          recognition.start();

        } catch (error) {
          console.error("Loop Error:", error);
          setStatus("idle");
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') setStatus("idle");
      // Silently restart on timeout errors to keep conversation alive
      if (e.error === 'no-speech') startAssistant(); 
    };

    recognition.start();
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-12">
        
        <div className="space-y-4">
          <h1 className="text-white text-xs tracking-[0.6em] uppercase font-bold opacity-70">
            Glacia Labs
          </h1>
          <p className="text-zinc-500 font-serif italic text-xl h-8">
            {status === "listening" ? "I'm listening..." : 
             status === "processing" ? "Thinking..." : 
             status === "speaking" ? "Speaking (Talk to interrupt)" : 
             "Tap to start conversation"}
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Pulse animation for different states */}
          {status !== "idle" && (
            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
              status === "listening" ? "bg-rose-500" : "bg-emerald-500"
            }`}></div>
          )}

          <button
            onClick={startAssistant}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border ${
              status === "listening" ? "bg-rose-900 border-rose-700 scale-110" :
              status === "speaking" ? "bg-zinc-800 border-emerald-900" :
              "bg-zinc-900 border-zinc-800"
            }`}
          >
            <div className={`flex gap-1 items-end h-6 ${status === "idle" ? "opacity-30" : "opacity-100"}`}>
              <span className={`w-1 bg-white ${status === 'listening' ? 'animate-[bounce_0.8s_infinite]' : 'h-2'}`}></span>
              <span className={`w-1 bg-white ${status === 'listening' ? 'animate-[bounce_1s_infinite]' : 'h-4'}`}></span>
              <span className={`w-1 bg-white ${status === 'listening' ? 'animate-[bounce_1.2s_infinite]' : 'h-3'}`}></span>
            </div>
          </button>
        </div>

        <div className="min-h-[80px]">
          <p className="text-zinc-400 text-sm font-light italic leading-relaxed">
            {transcript ? `"${transcript}"` : "Active conversation mode."}
          </p>
        </div>
      </div>
    </main>
  );
}