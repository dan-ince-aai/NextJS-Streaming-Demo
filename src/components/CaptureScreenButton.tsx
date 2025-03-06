"use client"

import { useAppContext } from "../context/AppContext"
import { Button } from "./ui/button"
import { MonitorSmartphone, StopCircle } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export default function CaptureScreenButton() {
  const { setTranscript, setWholeConversation, setStream, videoRef, stream, assemblyToken, setScreenTranscripts } = useAppContext()
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  
  // Keep track of the current partial transcript with a ref to avoid re-renders
  const currentPartialRef = useRef('')

  const startScreenShare = async () => {
    if (!assemblyToken) {
      setError('Please enter your AssemblyAI API key first');
      return;
    }
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        // @ts-ignore
        preferCurrentTab: false,
      })

      setStream(mediaStream)
      setIsCapturing(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      // Set up event listener for when the user stops sharing
      mediaStream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      const audioTrack = mediaStream.getAudioTracks()[0]
      if (audioTrack) {
        console.log("Audio found")
        
        // Create audio context to process the audio
        audioContextRef.current = new AudioContext({
          sampleRate: 16000, // Match the required sample rate
        })
        
        // Create a MediaStreamSource from the audio track
        const source = audioContextRef.current.createMediaStreamSource(new MediaStream([audioTrack]))
        
        // Create a processor node for audio processing
        processorNodeRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1)
        
        // Initialize the websocket connection first
        await connectToAssemblyAI()
        
        // Process audio data
        processorNodeRef.current.onaudioprocess = (e) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            // Get audio data
            const inputData = e.inputBuffer.getChannelData(0)
            
            // Convert to 16-bit PCM
            const pcmData = convertFloatTo16BitPCM(inputData)
            
            // Send the data
            try {
              socketRef.current.send(pcmData)
            } catch (error) {
              console.error('Error sending audio data:', error)
            }
          }
        }
        
        // Connect the nodes
        source.connect(processorNodeRef.current)
        processorNodeRef.current.connect(audioContextRef.current.destination)
        
        // Store the media recorder
        mediaRecorderRef.current = new MediaRecorder(mediaStream)
      } else {
        console.warn("No audio track found")
      }
    } catch (error) {
      console.error("Error accessing screen: ", error)
      setIsCapturing(false)
    }
  }

  // Convert Float32Array to Int16Array for PCM_S16LE format
  const convertFloatTo16BitPCM = (float32Array: Float32Array) => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      // Convert from [-1, 1] to [-32768, 32767]
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array.buffer
  }

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

  const connectToAssemblyAI = () => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Get a temporary token
        const tempToken = await getTemporaryToken();
        
        if (!tempToken) {
          setError('Failed to get temporary token');
          reject(new Error('Failed to get temporary token'));
          return;
        }
        
        // AssemblyAI WebSocket URL
        const url = "wss://api.assemblyai.com/v2/realtime/ws"
        
        // AssemblyAI query params with configuration
        const queryParams = new URLSearchParams({
          sample_rate: "16000",
          encoding: "pcm_s16le", // PCM 16-bit little-endian
          token: tempToken
        }).toString()
        
        console.log("Connecting to AssemblyAI with temporary token")
        socketRef.current = new WebSocket(`${url}?${queryParams}`)
        
        // Configure WebSocket events
        socketRef.current.onopen = () => {
          if (socketRef.current) {
            console.log("Connected to AssemblyAI WebSocket")
            resolve()
          }
        }
        
        socketRef.current.onerror = (error) => {
          console.error("WebSocket error", error)
          reject(error)
        }

        socketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.message_type === "PartialTranscript") {
              // Handle partial transcripts - these should update in place
              const partialTranscript = data.text
              const audioStart = data.audio_start;
              const audioEnd = data.audio_end;
              
              if (partialTranscript.trim()) {
                // Store the new partial transcript
                const oldPartial = currentPartialRef.current
                currentPartialRef.current = partialTranscript
                
                // Update the legacy transcript format for backward compatibility
                setTranscript((prevMessages) => {
                  // If this is the first partial after finals, just append it
                  if (!oldPartial) {
                    return prevMessages.trim() + ' ' + partialTranscript
                  }
              
                  // Find the last occurrence of the old partial to replace just that one
                  const lastIndex = prevMessages.lastIndexOf(oldPartial)
                  if (lastIndex >= 0) {
                    return prevMessages.substring(0, lastIndex) + partialTranscript
                  } else {
                    // If we somehow can't find the old partial, just append
                    return prevMessages.trim() + ' ' + partialTranscript
                  }
                })
                
                // Update the transcript items array
                setScreenTranscripts(prevItems => {
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
            } 
            else if (data.message_type === "FinalTranscript") {
              // Handle final transcripts - these should be locked in
              const transcript = data.text
              const audioStart = data.audio_start;
              const audioEnd = data.audio_end;
              
              if (transcript.trim()) {
                // Get the old partial before resetting
                const oldPartial = currentPartialRef.current
                // Reset the partial reference
                currentPartialRef.current = ''
                
                // Update the legacy transcript format for backward compatibility
                setTranscript((prevMessages) => {
                  // If there was a partial, replace it with the final
                  if (oldPartial) {
                    const lastIndex = prevMessages.lastIndexOf(oldPartial)
                    if (lastIndex >= 0) {
                      return prevMessages.substring(0, lastIndex) + transcript
                    }
                  }
                  // Otherwise just append with a space
                  return prevMessages.trim() + ' ' + transcript
                })

                // Update the whole conversation history
                setWholeConversation((prev) => {
                  if (prev[prev.length - 1]?.other) {
                    return [...prev.slice(0, -1), { other: prev[prev.length - 1].other + " " + transcript }]
                  } else {
                    return [...prev, { other: transcript }]
                  }
                })
                
                // Update the transcript items array
                setScreenTranscripts(prevItems => {
                  // If we have a partial item, finalize it
                  if (prevItems.length > 0 && !prevItems[prevItems.length - 1].isFinal) {
                    const updatedItems = [...prevItems];
                    updatedItems[updatedItems.length - 1] = {
                      text: transcript,
                      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                      audioStart,
                      audioEnd,
                      isFinal: true
                    };
                    return updatedItems;
                  }
                  
                  // Otherwise add a new final item
                  return [...prevItems, {
                    text: transcript,
                    timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    audioStart,
                    audioEnd,
                    isFinal: true
                  }];
                });
              }
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        }
      } catch (error) {
        console.error("Error in connectToAssemblyAI:", error);
        reject(error);
      }
    });
  }

  // Reference to store the audio context and processor node
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null)

  const stopScreenShare = () => {
    // Stop all media tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    // Clean up video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Clean up WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Send a termination message to the websocket
      socketRef.current.send(JSON.stringify({ terminate_session: true }))
      socketRef.current.close()
    }
    socketRef.current = null

    // Clean up audio processing
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect()
      processorNodeRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    setIsCapturing(false)
  }



  const handleButtonClick = () => {
    if (!assemblyToken) {
      setError('Please enter your AssemblyAI API token first');
      return;
    }
    
    if (isCapturing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  return (
    <div>
      {error && <p className="text-red-500 text-sm mb-2 font-medium">{error}</p>}
      <button
        onClick={handleButtonClick}
        className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isCapturing ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
      >
        {isCapturing ? (
          <>
            <StopCircle className="h-4 w-4" />
            Stop Capture
          </>
        ) : (
          <>
            <MonitorSmartphone className="h-4 w-4" />
            Capture Screen
          </>
        )}
      </button>
    </div>
  )
}
