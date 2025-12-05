# 🌾 Krishi-Mitra (Voice Agent)

**A Serverless, Voice-First Agricultural Finance Platform for Indian Farmers.**

---

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![LangChain](https://img.shields.io/badge/LangChain-AI-orange)
![Murf.ai](https://img.shields.io/badge/Murf.ai-Falcon%20TTS-purple)

## 📖 Overview

**Krishi-Mitra** bridges the digital divide for farmers by providing a seamless, **voice-first interface** to access financial services. It leverages advanced AI agents to handle loan applications, KYC verification, and credit scoring using natural conversation (English/Hinglish), powered by **Murf.ai** for high-fidelity speech and **LangChain** for intelligent orchestration.

Designed for low-latency (< 2s) interactions even on low-bandwidth networks, ensuring a "human-like" conversational experience.

## ✨ Key Features

*   **🗣️ Voice-First Interface**: Real-time push-to-talk interaction (WebSockets) designed for accessibility.
*   **🤖 AI Agents**: Intelligent agents handling:
    *   **KYC Verification**: Extracts and validates identity.
    *   **AgriStack Integration**: Mocks fetching land records and crop data.
    *   **Underwriting**: Real-time credit scoring and checking based on land/yield data.
*   **🔊 Premium TTS**: Integrated with **Murf.ai Falcon** model for natural, Indian-accented speech.
*   **⚡ Serverless & Fast**: Built on Next.js 14 App Router and Vercel Serverless Functions.
*   **💾 Low Latency State**: Uses **Upstash Redis** for caching voice context and specific TTS audio to minimize API costs and latency.
*   **🛡️ Secure**: Robust strict typing and MongoDB schema validation.

## 🏗️ Technical Architecture

```mermaid
graph TD
    User([User 👨‍🌾]) <-->|Voice/WebSocket| Frontend(Next.js Voice UI)
    Frontend <-->|Audio Blob| API[/api/chat Loop]
    
    subgraph "Serverless Backend"
        API --> STT(Google Speech-to-Text)
        STT --> Agent(LangChain Master Agent)
        
        Agent <-->|State/Context| Redis[(Upstash Redis)]
        
        Agent -->|Tool Call| KYC[KYC Agent]
        Agent -->|Tool Call| Agri[AgriStack Agent]
        Agent -->|Tool Call| Score[Scoring & Underwriting]
        
        Agent --Text Response--> TTS(Murf.ai Falcon Service)
        TTS --Check Cache--> Redis
        TTS --Generate--> MurfAPI[Murf API]
    end
    
    Agent --> DB[(MongoDB Atlas)]
    API --Push Update--> Ably(Ably Realtime)
    Ably --> Frontend
```

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   MongoDB Atlas Account
*   Upstash Redis Account
*   Ably Account
*   Google Cloud Service Account (for Speech-to-Text)
*   Murf.ai API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/krishi-mitra.git
    cd krishi-mitra
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Copy `.env.example` to `.env.local` and fill in your keys.
    ```bash
    cp .env.example .env.local
    ```

    **Required Variables:**
    ```env
    MONGODB_URI=mongodb+srv://...
    MURF_API_KEY=...
    ABLY_API_KEY=...
    UPSTASH_REDIS_REST_URL=...
    UPSTASH_REDIS_REST_TOKEN=...
    OPENAI_API_KEY=...
    # Path to Google Credentials JSON relative to root or raw content
    GOOGLE_APPLICATION_CREDENTIALS=... 
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🧪 Testing

We strictly enforce testing for reliability.

*   **Unit Tests**:
    ```bash
    npm test __tests__/unit
    ```
*   **Integration Tests**:
    ```bash
    npm test __tests__/integration
    ```
*   **Full Suite**:
    ```bash
    npm test
    ```

## 📂 Project Structure

```
├── src/
│   ├── agents/          # LangChain Agents & Tools
│   ├── app/             # Next.js App Router
│   │   └── api/chat/    # Main Voice Loop Endpoint
│   ├── components/      # UI Components (Voice Visualizer, etc.)
│   ├── hooks/           # Custom React Hooks
│   ├── lib/             # Service Adaptors (Murf, Redis, DB, Ably)
│   └── models/          # Mongoose Schemas (User, Loan, Logs)
├── __tests__/           # Jest Test Suites
└── public/              # Static Assets & Manifest
```

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

Built with ❤️ for **IITB Hacks**
