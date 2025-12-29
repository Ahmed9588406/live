/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500 })
    }

    const form = await request.formData()
    const file = form.get("file") as File | null
    const mode = (form.get("mode") as string) || "translate"
    const language = (form.get("language") as string) || "English"
    const prompt = (form.get("prompt") as string) || ""

    if (!file) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), { status: 400 })
    }

    // Forward the file and prompt to Whisper
    const fd = new FormData()
    fd.append("file", file, "chunk.webm")
    fd.append("model", "whisper-1")

    // Add language if provided to improve accuracy
    if (language) {
      // Convert common language names to ISO codes if possible, or just pass as is
      const langMap: Record<string, string> = {
        "Arabic": "ar",
        "English": "en",
        "French": "fr",
        "Spanish": "es",
        "German": "de",
      }
      const langCode = langMap[language] || language.toLowerCase().slice(0, 2)
      fd.append("language", langCode)
    }

    if (prompt) fd.append("prompt", prompt)

    const tRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fd as any,
    })

    if (!tRes.ok) {
      const txt = await tRes.text()
      console.error("OpenAI Whisper Error:", txt)
      return new Response(JSON.stringify({ error: "transcription error", detail: txt }), { status: 500 })
    }

    const tJson = await tRes.json()
    const transcript: string = tJson.text || ""

    if (!transcript.trim()) {
      return new Response(JSON.stringify({ transcript: "", translation: "" }), { status: 200 })
    }

    // Prepare for streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // First, send the transcript
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ transcript })}\n\n`))

        if (mode === "transcribe") {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ translation: transcript })}\n\n`))
          controller.close()
          return
        }

        // Then, stream the translation from GPT
        try {
          const systemPrompt = `You are a helpful translator. Respond with only the translated text, no commentary.`
          const userPrompt = `Translate the following text into ${language}. Keep meaning and tone.\n\n${transcript}`

          const cRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.2,
              max_tokens: 1000,
              stream: true, // Enable streaming from GPT
            }),
          })

          if (!cRes.ok) {
            const txt = await cRes.text()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "translation error", detail: txt })}\n\n`))
            controller.close()
            return
          }

          const reader = cRes.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let fullTranslation = ""
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const data = JSON.parse(line.slice(6))
                  const content = data.choices?.[0]?.delta?.content || ""
                  if (content) {
                    fullTranslation += content
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ partialTranslation: content })}\n\n`))
                  }
                } catch (e) {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ translation: fullTranslation, done: true })}\n\n`))
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (err: any) {
    console.error("Transcription API Error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
