"use client"

import { TranscriptItem, useAppContext } from "../context/AppContext"

interface TranscriptDisplayProps {
  type: 'screen' | 'microphone';
}

export default function TranscriptDisplay({ type }: TranscriptDisplayProps) {
  const { transcript, micTranscript, screenTranscripts, micTranscripts } = useAppContext()
  
  const activeTranscript = type === 'screen' ? transcript : micTranscript;
  const transcriptItems = type === 'screen' ? screenTranscripts : micTranscripts;
  const bgColor = type === 'screen' ? 'bg-green-500' : 'bg-purple-500';
  const icon = type === 'screen' ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  );
  
  // Show empty state if no transcripts
  if (transcriptItems.length === 0 && !activeTranscript) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-center p-4">
        <div className="max-w-xs">
          <p className="text-sm">Start {type === 'screen' ? 'screen capture' : 'microphone recording'} to see your transcription appear here in real-time</p>
        </div>
      </div>
    )
  }

  // If we have new transcript items, display them
  if (transcriptItems.length > 0) {
    return (
      <div className="space-y-4">
        {transcriptItems.map((item, index) => (
          <div key={index} className="flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
              {icon}
            </div>
            <div className={`flex-1 rounded-lg p-4 shadow-sm border border-slate-100 ${item.isFinal ? 'bg-white' : 'bg-slate-50'}`}>
              <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap">{item.text}</p>
              <div className="mt-2 flex justify-between items-center">
                <div>
                  {item.audioStart !== undefined && item.audioEnd !== undefined && (
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(item.audioStart)} - {formatTimestamp(item.audioEnd)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{item.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Fallback to old transcript display if we have activeTranscript but no items yet
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-start">
        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap">{activeTranscript}</p>
          <div className="mt-2 flex justify-end">
            <span className="text-xs text-slate-400">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to format milliseconds into MM:SS.ms format
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 100)}`;
}