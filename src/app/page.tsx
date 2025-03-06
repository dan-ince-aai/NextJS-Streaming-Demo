"use client";

import { useAppContext } from "../context/AppContext";
import CaptureScreenButton from "../components/CaptureScreenButton";
import MicrophoneButton from "../components/MicrophoneButton";
import TranscriptDisplay from "../components/TranscriptDisplay";
import { useEffect, useRef } from "react";

export default function Home() {
  const { transcript, micTranscript, videoRef, assemblyToken, setAssemblyToken } = useAppContext();
  
  // Load token from localStorage on initial render
  useEffect(() => {
    const savedToken = localStorage.getItem('assemblyAIToken');
    if (savedToken) {
      console.log('Loaded token from localStorage');
      setAssemblyToken(savedToken);
    }
  }, [setAssemblyToken]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with logo and title */}
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="https://avatars.githubusercontent.com/u/24515738?s=200&v=4"
              alt="AssemblyAI Logo"
              className="h-8 w-8 rounded-md"
            />
            <h1 className="text-xl font-semibold text-slate-800">Real-Time Transcription Demo</h1>
          </div>
          
          {/* Token input in header for easy access */}
          <div className="hidden md:flex items-center space-x-2 flex-1 max-w-lg ml-8">
            <div className="relative flex-1">
              <input
                type="password"
                value={assemblyToken}
                onChange={(e) => {
                  setAssemblyToken(e.target.value);
                  // Save to localStorage
                  localStorage.setItem('assemblyAIToken', e.target.value);
                }}
                placeholder="Enter AssemblyAI API key"
                className="w-full py-2 px-3 pr-20 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <a 
                href="https://www.assemblyai.com/app/account"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
              >
                Get API Key
              </a>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile token input (visible only on small screens) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3">
        <div className="relative">
          <input
            type="password"
            value={assemblyToken}
            onChange={(e) => setAssemblyToken(e.target.value)}
            placeholder="Enter AssemblyAI token"
            className="w-full py-2 px-3 pr-20 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <a 
            href="https://www.assemblyai.com/docs/api-reference/streaming/create-temporary-token?playground=%2Fdocs%2Fapi-reference%2Fstreaming%2Fcreate-temporary-token"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
          >
            Get Token
          </a>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main content with screen capture and transcription */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar with controls */}
          <div className="lg:col-span-3 space-y-6">
            {/* Screen capture controls */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-medium text-slate-800">Recording Controls</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-2">Capture your screen with audio</p>
                  <CaptureScreenButton />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-2">Record from your microphone</p>
                  <MicrophoneButton />
                </div>
              </div>
            </div>
            
            {/* Instructions panel */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-medium text-slate-800">How It Works</h2>
              </div>
              <div className="p-4">
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Enter your AssemblyAI API key</li>
                  <li>Choose screen capture and/or microphone recording</li>
                  <li>Start speaking or playing audio</li>
                  <li>Watch as the audio is transcribed in real-time</li>
                </ol>
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Screen preview */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-medium text-slate-800">Screen Preview</h2>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Live Preview</span>
              </div>
              <div className="p-4">
                <div className="max-w-3xl mx-auto aspect-video bg-slate-900 rounded-lg overflow-hidden">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-contain" 
                    autoPlay 
                    playsInline
                    muted 
                  />
                </div>
              </div>
            </div>
            
            {/* Transcription area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Screen transcription */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-medium text-slate-800">Screen Audio Transcription</h2>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Screen</span>
                </div>
                <div className="p-0">
                  <div className="h-[400px] overflow-y-auto p-4">
                    <TranscriptDisplay type="screen" />
                  </div>
                </div>
              </div>
              
              {/* Microphone transcription */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-medium text-slate-800">Microphone Transcription</h2>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">Microphone</span>
                </div>
                <div className="p-0">
                  <div className="h-[400px] overflow-y-auto p-4">
                    <TranscriptDisplay type="microphone" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Powered by</span>
            <a 
              href="https://www.assemblyai.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              <img 
                src="https://avatars.githubusercontent.com/u/24515738?s=200&v=4"
                alt="AssemblyAI Logo"
                className="h-4 w-4"
              />
              <span className="text-xs font-medium">AssemblyAI</span>
            </a>
          </div>
          
          <div className="text-xs text-slate-500">
            <p>Real-time transcription with WebSockets and browser audio capture</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
