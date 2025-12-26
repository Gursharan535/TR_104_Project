# 🧠 AI Workspace: Intelligent Meeting Assistant

An enterprise-grade collaboration platform that transforms video meetings into actionable insights using Generative AI. 

Features **RAG (Retrieval-Augmented Generation)**, **Autonomous Agents**, **Semantic Search**, and **Biometric Security**.

![Project Status](https://img.shields.io/badge/Status-Capstone_Complete-success)
![Tech Stack](https://img.shields.io/badge/Stack-React_FastAPI_ChromaDB-blue)

## 🚀 Key Features

### 🤖 Generative AI & RAG
- **Multi-Model Orchestration:** Uses **AssemblyAI** for transcription, **Fireworks (Llama 3)** for analysis, and **Google Gemini** for chat.
- **Context-Aware Chat:** Chat with your meeting history using a Vector Database (ChromaDB).
- **Smart Summarization:** Automatically generates Executive Summaries, Key Points, and Action Items.

### 🕵️‍♂️ Autonomous Agents
- **Fact-Checker Agent:** Verifies claims made in meetings using live web search (Tavily API).
- **Email Automation:** Drafts and sends professional follow-up emails via SMTP.

### 🧠 Advanced NLP
- **Semantic Search:** Search meetings by *meaning* (e.g., "budget issues" finds "cost overrun"), not just keywords.
- **Entity Extraction:** Automatically identifies People, Organizations, and Locations using Spacy.
- **Auto-Translation:** Detects 90+ languages and translates transcripts to English.

### 🛡️ Security & DevOps
- **Real-time Email Validation:** DNS/MX record checking during signup.
- **JWT Authentication:** Secure session management.
- **Dockerized:** Full container support for easy deployment.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React (Vite), TypeScript, TailwindCSS | UI/UX & State Management |
| **Backend** | Python (FastAPI) | API Logic & Orchestration |
| **Database** | SQLite (SQLModel) | User & Meeting Data |
| **Vector DB** | ChromaDB | Embeddings for Semantic Search |
| **AI Models** | Llama 3, Gemini 1.5 Flash, AssemblyAI | Intelligence Layer |
| **Tools** | Spacy, Tavily, Smtplib | NLP & External Actions |

---

## ⚙️ Installation & Setup

### Prerequisites
1.  Node.js & npm
2.  Python 3.10+
3.  API Keys for: Google Gemini, AssemblyAI, Fireworks AI, Tavily.

### 1. Clone & Configure
```bash
git clone https://github.com/yourusername/ai-workspace.git
cd ai-workspace