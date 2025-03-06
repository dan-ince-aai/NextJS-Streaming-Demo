"use client"

import React, { createContext, useContext, useState, useRef } from 'react';

interface AppContextProps {
  children: React.ReactNode;
}

export interface TranscriptItem {
  text: string;
  timestamp: string;
  audioStart?: number;
  audioEnd?: number;
  isFinal: boolean;
}

interface AppContextState {
  transcript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  micTranscript: string;
  setMicTranscript: React.Dispatch<React.SetStateAction<string>>;
  screenTranscripts: TranscriptItem[];
  setScreenTranscripts: React.Dispatch<React.SetStateAction<TranscriptItem[]>>;
  micTranscripts: TranscriptItem[];
  setMicTranscripts: React.Dispatch<React.SetStateAction<TranscriptItem[]>>;
  wholeConversation: Array<{ user?: string; other?: string }>;
  setWholeConversation: React.Dispatch<React.SetStateAction<Array<{ user?: string; other?: string }>>>;
  stream: MediaStream | null;
  setStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  micStream: MediaStream | null;
  setMicStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  microphoneConnected: boolean;
  setMicrophoneConnected: React.Dispatch<React.SetStateAction<boolean>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  assemblyToken: string;
  setAssemblyToken: React.Dispatch<React.SetStateAction<string>>;
}

const AppContext = createContext<AppContextState | null>(null);

export function AppProvider({ children }: AppContextProps) {
  const [transcript, setTranscript] = useState<string>('');
  const [micTranscript, setMicTranscript] = useState<string>('');
  const [screenTranscripts, setScreenTranscripts] = useState<TranscriptItem[]>([]);
  const [micTranscripts, setMicTranscripts] = useState<TranscriptItem[]>([]);
  const [wholeConversation, setWholeConversation] = useState<Array<{ user?: string; other?: string }>>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [microphoneConnected, setMicrophoneConnected] = useState<boolean>(false);
  const [assemblyToken, setAssemblyToken] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <AppContext.Provider
      value={{
        transcript,
        setTranscript,
        micTranscript,
        setMicTranscript,
        screenTranscripts,
        setScreenTranscripts,
        micTranscripts,
        setMicTranscripts,
        wholeConversation,
        setWholeConversation,
        stream,
        setStream,
        micStream,
        setMicStream,
        microphoneConnected,
        setMicrophoneConnected,
        videoRef,
        assemblyToken,
        setAssemblyToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
