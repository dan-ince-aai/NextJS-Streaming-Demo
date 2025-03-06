"use client"

import { useAppContext } from "../context/AppContext"
import { Button } from "./ui/button"
import { Mic, MicOff } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { RealtimeTranscriber } from "assemblyai/streaming"

export default function MicrophoneButton() {
  const {
    microphoneConnected,
    setMicrophoneConnected,
    micStream,
    setMicStream,
    setMicTranscript,
    wholeConversation,
    setWholeConversation,
    assemblyToken,
    setMicTranscripts
  } = useAppContext()

  const transcriberRef = useRef<RealtimeTranscriber | null>(null);
  const micConnected = useRef(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTokenError, setShowTokenError] = useState(false);
  
  // Keep track of the current partial transcript with a ref to avoid re-renders
  const currentPartialRef = useRef('');
  
  // Function to get a temporary token from our API endpoint
  const getTemporaryToken = async () => {
    try {
      if (!assemblyToken) {
        console.error('No API key found');
        return null;
      }
            
      // Call our API endpoint to get a temporary token
      const response = await fetch(`/api/token?apiKey=${encodeURIComponent(assemblyToken)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get temporary token:', errorData.error);
        return null;
      }
      
      const data = await response.json();
      console.log('Successfully got temporary token');
      return data.token;
    } catch (error) {
      console.error('Error getting temporary token:', error);
      return null;
    }
  };

  const createTranscriber = useCallback(async () => {
    console.log('Getting temporary token for transcriber...');
    
    // Get a temporary token
    const tempToken = await getTemporaryToken();
    
    if (!tempToken) {
      console.error('Failed to get temporary token');
      return null;
    }
    
    console.log('Creating transcriber with temporary token');
    
    // Create the transcriber with the temporary token
    const transcriber = new RealtimeTranscriber({
      sampleRate: 44100, // Use standard sample rate, will be resampled if needed
      encoding: 'pcm_s16le', // Explicitly set encoding to match our Int16Array format
      token: tempToken
    });
    
    transcriber.on('transcript', (transcript) => {
      if (!transcript.text) {
        return;
      }
      
      const audioStart = transcript.audio_start;
      const audioEnd = transcript.audio_end;
      
      if (transcript.message_type === 'PartialTranscript') {
        // Handle partial transcripts - update in place
        const partialTranscript = transcript.text;
        if (partialTranscript.trim()) {
          // Store the new partial transcript
          const oldPartial = currentPartialRef.current;
          currentPartialRef.current = partialTranscript;
          
          // Update the legacy transcript format for backward compatibility
          setMicTranscript((prevMessages) => {
            // If this is the first partial after finals, just append it
            if (!oldPartial) {
              return prevMessages.trim() + ' ' + partialTranscript;
            }
            
            // Find the last occurrence of the old partial to replace just that one
            const lastIndex = prevMessages.lastIndexOf(oldPartial);
            if (lastIndex >= 0) {
              return prevMessages.substring(0, lastIndex) + partialTranscript;
            } else {
              // If we somehow can't find the old partial, just append
              return prevMessages.trim() + ' ' + partialTranscript;
            }
          });
          
          // Update the transcript items array
          setMicTranscripts(prevItems => {
            // If we have a partial item, update it
            if (prevItems.length > 0 && !prevItems[prevItems.length - 1].isFinal) {
              const updatedItems = [...prevItems];
              updatedItems[updatedItems.length - 1] = {
                text: partialTranscript,
                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                audioStart,
                audioEnd,
                isFinal: false
              };
              return updatedItems;
            }
            
            // Otherwise add a new partial item
            return [...prevItems, {
              text: partialTranscript,
              timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              audioStart,
              audioEnd,
              isFinal: false
            }];
          });
        }
      } else {
        // Handle final transcripts - these should be locked in
        const finalTranscript = transcript.text;
        if (finalTranscript.trim()) {
          // Get the old partial before resetting
          const oldPartial = currentPartialRef.current;
          // Reset the partial reference
          currentPartialRef.current = '';
          
          // Update the legacy transcript format for backward compatibility
          setMicTranscript((prevMessages) => {
            // If there was a partial, replace it with the final
            if (oldPartial) {
              const lastIndex = prevMessages.lastIndexOf(oldPartial);
              if (lastIndex >= 0) {
                return prevMessages.substring(0, lastIndex) + finalTranscript;
              }
            }
            // Otherwise just append with a space
            return prevMessages.trim() + ' ' + finalTranscript;
          });
          
          // Update the whole conversation history
          setWholeConversation((prev) => {
            if (prev.length > 0 && prev[prev.length - 1]?.user) {
              return [...prev.slice(0, -1), { user: finalTranscript }];
            } else {
              return [...prev, { user: finalTranscript }];
            }
          });
          
          // Update the transcript items array
          setMicTranscripts(prevItems => {
            // If we have a partial item, finalize it
            if (prevItems.length > 0 && !prevItems[prevItems.length - 1].isFinal) {
              const updatedItems = [...prevItems];
              updatedItems[updatedItems.length - 1] = {
                text: finalTranscript,
                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                audioStart,
                audioEnd,
                isFinal: true
              };
              return updatedItems;
            }
            
            // Otherwise add a new final item
            return [...prevItems, {
              text: finalTranscript,
              timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              audioStart,
              audioEnd,
              isFinal: true
            }];
          });
        }
      }
    });

    transcriber.on('error', (error) => {
      console.error('Transcriber error:', error);
    });
    
    transcriber.on('open', () => {
      console.log('Transcriber connection opened');
    });

    transcriber.on('close', () => {
      console.log('Transcriber connection closed');
    });

    return transcriber;
  }, [assemblyToken, setMicTranscript, setWholeConversation, setMicTranscripts, getTemporaryToken]);

  const handleClick = () => {
    if (!assemblyToken) {
      setShowTokenError(true);
      return;
    }
    setShowTokenError(false);
    handleConnectMicrophone();
  };

  const handleConnectMicrophone = async () => {
    if (micConnected.current) {
      setIsConnecting(false);
      setMicrophoneConnected(false);
      micConnected.current = false;
      
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        setMicStream(null);
      }
      
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        setAudioContext(null);
      }
      
      if (transcriberRef.current) {
        try {
          await transcriberRef.current.close(false);
        } catch (error) {
          console.error('Error closing transcriber:', error);
        }
        transcriberRef.current = null;
      }
      
      console.log("Microphone disconnected.");
    } else {
      setIsConnecting(true);
      
      try {
        // Request audio with specific constraints to ensure quality
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false, // Try disabling these to get raw audio
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: 1  // Mono audio
          } 
        });
        
        console.log("Microphone stream obtained:", stream.getAudioTracks());
        
        setMicStream(stream);
        setMicrophoneConnected(true);
        micConnected.current = true;
        
        // Try a simpler approach to audio processing
        const newAudioContext = new AudioContext();
        console.log("Audio context sample rate:", newAudioContext.sampleRate);
        
        // Create a script processor node instead of worklet for better compatibility
        // @ts-ignore - ScriptProcessor is deprecated but still works
        const scriptNode = newAudioContext.createScriptProcessor(4096, 1, 1);
        const source = newAudioContext.createMediaStreamSource(stream);
        source.connect(scriptNode);
        scriptNode.connect(newAudioContext.destination);
        
        setAudioContext(newAudioContext);
        
        // Check for token first
        if (!assemblyToken) {
          setShowTokenError(true);
          throw new Error("AssemblyAI API key is not set");
        }
        
        // Then create and connect the transcriber
        const newTranscriber = await createTranscriber();
        if (!newTranscriber) {
          setShowTokenError(true);
          throw new Error("Failed to create transcriber - check your AssemblyAI API key");
        }
        
        console.log("Connecting transcriber...");
        await newTranscriber.connect();
        console.log("Transcriber connected successfully");
        
        transcriberRef.current = newTranscriber;
        
        // Process audio with script processor
        scriptNode.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
          if (!transcriberRef.current || !micConnected.current) return;
          
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array for PCM_S16LE format
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Convert from [-1, 1] to [-32768, 32767]
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Send to transcriber
          try {
            if (Math.random() < 0.01) { // Log less frequently
              console.log("Sending audio buffer with length:", int16Array.length);
            }
            transcriberRef.current?.sendAudio(int16Array);
          } catch (error) {
            console.error("Error sending audio:", error);
          }
        };
        
        console.log("Microphone connected and transcription started.");
        
      } catch (err) {
        console.error("Error connecting microphone:", err);
        
        if (micStream) {
          micStream.getTracks().forEach((track) => track.stop());
          setMicStream(null);
        }
        
        if (transcriberRef.current) {
          try {
            await transcriberRef.current.close(false);
          } catch (e) {
            console.error("Error closing transcriber on cleanup:", e);
          }
          transcriberRef.current = null;
        }
        
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
          setAudioContext(null);
        }
      } finally {
        setIsConnecting(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (transcriberRef.current) {
        try {
          // transcriberRef.current.close(false);
        } catch (error) {
          console.error("Error closing transcriber on unmount:", error);
        }
      }
      
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioContext, micStream]);



  return (
    <div>
      {showTokenError && <p className="text-red-500 text-sm mb-2 font-medium">Please enter your AssemblyAI API key first</p>}
      <button
        className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${microphoneConnected ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
        onClick={handleClick}
        disabled={isConnecting}
      >
        {isConnecting ? (
          "Connecting..."
        ) : microphoneConnected ? (
          <>
            <MicOff className="h-4 w-4" />
            Disconnect Mic
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Connect Mic
          </>
        )}
      </button>
    </div>
  );
}
