import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 })
        }

        const body = await request.json().catch(() => ({}))
        const { targetLanguage = "Arabic" } = body

        let instructions = "You are a real-time transcription assistant. Please focus on accurate transcription of Arabic and English speech. Return the transcript as clearly as possible."

        if (targetLanguage === "English") {
            instructions = "You are a real-time translator. Translate everything you hear into English text. Provide ONLY the translation, no extra commentary."
        } else if (targetLanguage === "French") {
            instructions = "You are a real-time translator. Translate everything you hear into French text. Provide ONLY the translation, no extra commentary."
        } else if (targetLanguage === "Spanish") {
            instructions = "You are a real-time translator. Translate everything you hear into Spanish text. Provide ONLY the translation, no extra commentary."
        } else if (targetLanguage !== "Arabic") {
            instructions = `You are a real-time translator. Translate everything you hear into ${targetLanguage} text. Provide ONLY the translation, no extra commentary.`
        } else {
            instructions = "You are a real-time transcription assistant. Output the exact Arabic text heard. If English is heard, output English. No extra commentary."
        }

        // Create a Realtime session with transcription capabilities
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                modalities: ["text", "audio"],
                instructions: instructions,
                voice: "alloy",
                input_audio_transcription: {
                    model: "whisper-1"
                },
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
