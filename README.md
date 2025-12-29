# 🎙️ Live Khotba Real-time Transcription

A powerful, ultra-low latency web application designed for real-time transcription of live Khotbas (sermons). This project leverages OpenAI's cutting-edge **Realtime API (WebRTC)** to provide seamless, streaming speech-to-text in both Arabic and English.

## ✨ Features

-   **Ultra-Low Latency**: Uses WebRTC for direct, streaming audio communication with OpenAI, ensuring transcripts appear almost instantly.
-   **Arabic Optimized**: Specifically tuned for high-accuracy Arabic transcription, making it ideal for live Islamic sermons.
-   **Multi-language Support**: Accurately detects and transcribes both Arabic and English.
-   **Modern UI**: A sleek, dark-themed interface built with Next.js and Tailwind CSS, featuring real-time audio level monitoring.
-   **Secure**: Uses ephemeral client tokens to communicate directly and safely with OpenAI from the browser.

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+ 
-   An OpenAI API Key (with access to the Realtime API models)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone [repository-url]
    cd live-khotba-transcription
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup**:
    Create a `.env.local` file in the root directory and add your OpenAI API key:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open the app**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Technology Stack

-   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **AI Engine**: [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
-   **Communication**: WebRTC (RTCPeerConnection & Data Channels)
-   **Model**: `gpt-4o-realtime-preview`

## 📖 How It Works

1.  **Session Handshake**: The frontend requests an ephemeral token from the backend (`/api/session`).
2.  **WebRTC Connection**: The browser establishes a direct Peer Connection with OpenAI.
3.  **Streaming Audio**: Your microphone audio is captured and streamed via the WebRTC audio track.
4.  **Real-time Events**: Transcription results are received via a WebRTC Data Channel as soon as speech is processed.
5.  **Dynamic Display**: The UI updates immediately, providing a live feed of the Khotba.

## 🕌 Use Case: Live Khotba Transcription

This tool is specifically designed to assist in making Khotbas more accessible. By providing a live, accurate transcript:
-   **Accessibility**: Helps those with hearing impairments follow the sermon.
-   **Language Clarity**: Assists non-native speakers in understanding the Arabic or English content.
-   **Documentation**: Provides an immediate textual record of the sermon for later review or translation.

---

Built with ❤️ for the community.
