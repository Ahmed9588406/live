/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useRef, useState, useEffect } from "react"

export default function Page() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [status, setStatus] = useState("Ready")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [transcript])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRealtime()
    }
  }, [])

  const monitorAudio = (stream: MediaStream) => {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    
    analyserRef.current = analyser
    audioContextRef.current = audioContext

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateLevel = () => {
      if (!analyserRef.current) return
      analyserRef.current.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength
      setAudioLevel(average)
      animationRef.current = requestAnimationFrame(updateLevel)
    }
    updateLevel()
  }

  const initRealtimeSession = async () => {
    setError(null)
    setIsLoading(true)
    setStatus("Generating ephemeral token...")

    try {
      // 1. Get ephemeral token
      const sessionRes = await fetch("/api/session", { method: "POST" })
      if (!sessionRes.ok) throw new Error("Failed to create session")
      const sessionData = await sessionRes.json()
      const EPHEMERAL_KEY = sessionData.client_secret.value

      setStatus("Initializing WebRTC...")

      // 2. Create peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // Add audio element to play back response (though we mainly want text)
      const audioEl = document.createElement("audio")
      audioEl.autoplay = true
      pc.ontrack = e => audioEl.srcObject = e.streams[0]

      // 3. Add microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      pc.addTrack(stream.getTracks()[0])
      monitorAudio(stream)

      // 4. Create data channel
      const dc = pc.createDataChannel("oai-events")
      dataChannelRef.current = dc

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          
          // When a transcription is completed for a user message
          if (event.type === "conversation.item.input_audio_transcription.completed") {
            const text = event.transcript || ""
            if (text.trim()) {
              setTranscript(prev => prev ? prev + " " + text.trim() : text.trim())
            }
          }
          
          // Model response text (if we want to see what the AI says back)
          if (event.type === "response.audio_transcription.delta") {
             // Handle delta if we want to show AI speaking
          }

          if (event.type === "error") {
            console.error("OpenAI Realtime Error:", event.error)
            setError(event.error.message || "An error occurred with the Realtime API")
          }
        } catch (err) {
          console.error("DC Message parse error:", err)
        }
      }

      dc.onopen = () => {
        setStatus("Connected (Realtime)")
        setIsRecording(true)
        setIsLoading(false)
      }

      // 5. SDP Exchange
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const baseUrl = "https://api.openai.com/v1/realtime"
      const model = "gpt-4o-realtime-preview-2024-12-17"
      const sdpRes = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      })

      if (!sdpRes.ok) {
        const errTxt = await sdpRes.text()
        throw new Error(`SDP Exchange failed: ${errTxt}`)
      }

      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
      })

    } catch (err: any) {
      console.error("Realtime start error:", err)
      setError(err.message || String(err))
      setIsLoading(false)
      setStatus("Error")
      cleanupRealtime()
    }
  }

  const cleanupRealtime = () => {
    if (dataChannelRef.current) dataChannelRef.current.close()
    if (peerConnectionRef.current) peerConnectionRef.current.close()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (audioContextRef.current) audioContextRef.current.close()

    dataChannelRef.current = null
    peerConnectionRef.current = null
    streamRef.current = null
    analyserRef.current = null
    setAudioLevel(0)
    setIsRecording(false)
    setStatus("Stopped")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Real-time Arabic Transcription
          </h1>
          <p className="text-slate-400">Powered by OpenAI Whisper</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={isRecording ? cleanupRealtime : initRealtimeSession}
              disabled={isLoading}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording 
                  ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/30" 
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/30"
              }`}
            >
              {isLoading ? (
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : isRecording ? (
                <span className="w-4 h-4 bg-white rounded-sm" />
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a3 3 0 016 0v6a3 3 0 01-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              )}
              {isLoading ? "Starting..." : isRecording ? "Stop Recording" : "Start Transcribing"}
            </button>

            {isRecording && (
              <div className="w-full max-w-xs bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel * 2)}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div className={`flex items-center gap-2 text-sm ${isRecording ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {status}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Transcript</h2>
            <button
              onClick={() => setTranscript("")}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-700/50 rounded-full transition-colors"
            >
              Clear
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={transcript}
            readOnly
            dir="auto"
            placeholder="Speak in Arabic or English. Transcription will appear here..."
            className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-xl leading-relaxed"
          />
        </div>

        <p className="text-center text-xs text-slate-500">
          Using Continuous Audio Chunking • OpenAI Whisper API • Multi-language Support
        </p>
      </div>
    </main>
  )
}
