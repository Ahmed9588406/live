import { NextResponse } from "next/server"

export async function POST() {
    try {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 })
        }

        // Create a Realtime session with transcription capabilities
        // Using gpt-4o-realtime-preview which supports input_audio_transcription
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                modalities: ["text", "audio"],
                instructions: "You are a real-time transcription assistant. Please focus on accurate transcription of Arabic and English speech. Return the transcript as clearly as possible. If the user speaks in Arabic, provide the Arabic text. If they speak in English, provide English.",
                voice: "alloy",
                // Enable input audio transcription for real-time speech-to-text
                input_audio_transcription: {
                    model: "whisper-1"
                },
                // Server-side Voice Activity Detection for automatic turn detection
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                }
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            console.error("OpenAI session error:", error)
            return NextResponse.json({ error: "Failed to create session", detail: error }, { status: 500 })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error("Session creation error:", err)
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
