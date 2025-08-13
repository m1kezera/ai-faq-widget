# AI FAQ Widget — Full Project

> **Note:** Some inline code comments may appear in **Portuguese** as part of the original development notes. The README is fully in English.
>
> This repository contains **both** the backend API (NestJS) and the embeddable frontend widget (React). The widget answers questions **using your own documents** and captures a **lead** (name/email/message) whenever confidence is low.

---

## 🧭 Table of Contents
1. [What You Get](#what-you-get)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start (Local, 10–15 min)](#quick-start-local-10–15-min)
5. [Project Structure](#project-structure)
6. [Backend (NestJS API)](#backend-nestjs-api)
   - [Environment](#environment)
   - [Run Locally](#run-locally)
   - [API Endpoints](#api-endpoints)
   - [Data Models](#data-models)
   - [CORS](#cors)
7. [Widget (React)](#widget-react)
   - [Run Locally](#run-locally-1)
   - [Configuration](#configuration)
   - [Styling](#styling)
   - [Build & Deploy (Vercel)](#build--deploy-vercel)
   - [Embed in Any Website](#embed-in-any-website)
8. [End‑to‑End Test Flow](#end-to-end-test-flow)
9. [Troubleshooting](#troubleshooting)
10. [Roadmap / Next Steps](#roadmap--next-steps)
11. [License](#license)

---

## ✅ What You Get

- **Docs ingestion**: send raw text to the backend → it is chunked & stored in MongoDB.
- **Contextual answers**: `/ask` does lightweight retrieval and asks **LLaMA 3** (via **Ollama**) to answer **only from your context**.
- **Lead capture**: when confidence is low, the widget shows a form and posts to `/leads`.
- **Embeddable widget**: a polished floating chat you can drop into any site via `<script src=".../embed.js">`.

---

## 🧱 Architecture

```
+-------------+          +-------------------+          +---------------------+
|  Your Site  |  <-----> |  Widget (React)   |  <-----> |  Backend API (Nest) |
+-------------+          +-------------------+          +---------------------+
                                                             |
                                                             v
                                                      +-------------+
                                                      |  MongoDB    |
                                                      | (local/Atlas)|
                                                      +-------------+
                                                             |
                                                             v
                                                      +-------------+
                                                      |  Ollama     |
                                                      |  LLaMA 3    |
                                                      +-------------+
```

- Retrieval: **keyword overlap** scoring (fast, dependency‑free). Easy to upgrade to **embeddings/cosine** later.
- Model: **LLaMA 3** via **Ollama** (local). You can swap to cloud models (OpenAI/Claude) with a small change.

---

## 🧰 Prerequisites

- **Node.js** 18+ and **npm**
- **Git**
- **MongoDB** (local or Atlas). For local, default connection is `mongodb://localhost:27017`.
- **Ollama** with LLaMA 3 model:
  ```bash
  # install Ollama from https://ollama.com/
  ollama pull llama3
  ollama serve
  ```

> Windows tip: use **PowerShell** for the commands below.

---

## ⚡ Quick Start (Local, 10–15 min)

```bash
# 1) Clone the repo
git clone https://github.com/m1kezera/ai-faq-widget.git
cd ai-faq-widget

# 2) Backend
cd backend
npm install
# Create .env (see template below) then:
npm run start:dev
# -> should print: 🚀 API listening on http://localhost:3001

# 3) (In another terminal) Widget
cd ../widget
npm install
npm start
# -> opens http://localhost:3000

# 4) Ingest a small test document
# PowerShell example:
$body = @{ text = "This is a sample FAQ text to be split into chunks for testing." } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/docs/upload" `
  -Headers @{ "x-site-key"="testsite123"; "Content-Type"="application/json" } `
  -Body $body

# 5) Ask via widget at http://localhost:3000
# or via PowerShell:
$ask = @{ question = "What is the sample text about?" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/ask" `
  -Headers @{ "x-site-key"="testsite123"; "Content-Type"="application/json" } `
  -Body $ask
```

---

## 📁 Project Structure

```
ai-faq-widget/
├─ backend/             # NestJS API: docs, ask, leads, sites
├─ widget/              # React floating chat widget
├─ LICENSE              # MIT
├─ README.md            # You are here
└─ .gitignore
```

---

## 🖥 Backend (NestJS API)

Handles ingestion, retrieval, AI generation, and leads.

### Environment

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=faq_widget
PORT=3001
# optional (production hardening)
# ALLOWED_ORIGINS=https://your-widget.vercel.app,https://your-site.com
```

### Run Locally

```bash
cd backend
npm install
npm run start:dev
```
- API: `http://localhost:3001`
- Make sure **Ollama** is running (`ollama serve`)

### API Endpoints

**1) Upload docs**  
Stores text split into chunks for a given `siteKey`.
```bash
curl -X POST http://localhost:3001/docs/upload   -H "x-site-key: testsite123"   -H "Content-Type: application/json"   -d '{"text":"This is a sample FAQ text"}'
```
_Response_
```json
{ "message": "Chunks saved", "inserted": 1 }
```

**2) Ask a question**  
Does retrieval + calls LLaMA 3 via Ollama.
```bash
curl -X POST http://localhost:3001/ask   -H "x-site-key: testsite123"   -H "Content-Type: application/json"   -d '{"question":"What is the sample text about?"}'
```
_Response (example)_
```json
{
  "answer": "It’s an example FAQ section…",
  "confidence": 0.22,
  "usedChunks": 3,
  "sources": ["66b9..."]
}
```

**3) Create a lead**  
Posted by the widget when confidence is low.
```bash
curl -X POST http://localhost:3001/leads   -H "x-site-key: testsite123"   -H "Content-Type: application/json"   -d '{"name":"John Doe","email":"john@example.com","message":"Follow-up"}'
```
_Response_
```json
{ "ok": true, "id": "66b9..." }
```

**(Optional) 4) Export leads (CSV)**  
```bash
curl -X GET http://localhost:3001/leads/export -H "x-site-key: testsite123"
```

### Data Models

- **DocChunk**
  ```ts
  { siteKey: string, chunk: string, createdAt: Date }
  ```
- **Lead**
  ```ts
  { siteKey: string, name?: string, email?: string, message?: string, source?: string, createdAt: Date }
  ```
- **Site** (future usage/quota)
  ```ts
  { siteKey: string, monthlyQuota?: number, usage?: number }
  ```

### CORS

For dev (allow all):
```ts
// src/main.ts
app.enableCors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Accept, Authorization, x-site-key',
});
```

For production (restrict domains):
```ts
app.enableCors({
  origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Accept, Authorization, x-site-key',
});
```

---

## 💬 Widget (React)

A floating chat that talks to your backend.

### Run Locally
```bash
cd widget
npm install
npm start
# http://localhost:3000
```

### Configuration

In `src/App.tsx`, the widget reads `API_BASE` and `SITE_KEY` in this order:
1) `window.__AIWIDGET_API__` and `window.__AIWIDGET_SITE_KEY__` (set by embed.js)
2) Querystring: `?api=...&siteKey=...`
3) `process.env.REACT_APP_API_BASE`
4) Defaults to `http://localhost:3001` and `testsite123`

Basic constants (fallback):
```ts
const API_BASE =
  (window as any).__AIWIDGET_API__ ||
  new URLSearchParams(window.location.search).get('api') ||
  process.env.REACT_APP_API_BASE ||
  'http://localhost:3001';

const SITE_KEY =
  (window as any).__AIWIDGET_SITE_KEY__ ||
  new URLSearchParams(window.location.search).get('siteKey') ||
  'testsite123';
```

### Styling

- Minimalist, production‑ready UI with bubbles, typing dots, and lead card.
- Fully contained CSS in `src/App.css` (no global leak).

### Build & Deploy (Vercel)

```bash
cd widget
npm run build
```
- **Root Directory** on Vercel: `widget`
- **Build Command**: `npm run build`
- **Output Directory**: `build`

After deploy, you can access:
```
https://your-widget.vercel.app/
https://your-widget.vercel.app/embed.js
```

### Embed in Any Website

**Script (recommended) — loads an iframe automatically**

```html
<script
  src="https://your-widget.vercel.app/embed.js"
  data-site-key="testsite123"
  data-api="https://YOUR-BACKEND-API"
  async
></script>
```

**Direct iframe (simple test)**

```html
<iframe src="https://your-widget.vercel.app/?embed=1&siteKey=testsite123&api=https://YOUR-BACKEND-API"
        style="border:none;width:360px;height:520px;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.35)">
</iframe>
```

---

## 🔁 End‑to‑End Test Flow

1) Start **MongoDB**, **Ollama** (`ollama serve`), **Backend** (`npm run start:dev`), and **Widget** (`npm start`).  
2) Upload a small doc to `/docs/upload`.  
3) Ask something in the widget — receive an AI answer.  
4) If confidence < threshold (e.g., `0.35`), lead form appears. Submit it.  
5) Check **MongoDB** → `leads` collection contains your entry.

Tip: during development, you can temporarily **force low confidence** in the backend to always show the form (we used `confidence = 0.2` for testing).

---

## 🧩 Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Widget says “Error contacting server.” | CORS blocked or backend not running | Ensure backend at `http://localhost:3001` and add `app.enableCors(...)` |
| `500 Internal server error` on `/ask` | Ollama not running or model missing | Run `ollama serve` and `ollama pull llama3` |
| No answers / irrelevant answers | No chunks for this `siteKey` or retrieval too strict | Upload docs to `/docs/upload`; adjust retrieval (increase candidates) |
| Lead not saved | Missing `x-site-key` header or backend not receiving | Check widget `SITE_KEY`, inspect Network tab, verify `/leads` |
| Deployed widget can’t call backend | CORS in production | Set `ALLOWED_ORIGINS` in backend and restart |

---

## 🗺 Roadmap / Next Steps

- [ ] **Embeddings** (OpenAI / nomic / Ollama embeddings) + cosine similarity in MongoDB.
- [ ] **Admin dashboard** (view leads, usage, export CSV).
- [ ] **Auth** for admin routes.
- [ ] **Streaming answers** (SSE) in widget.
- [ ] **Multi‑tenant quotas** per `siteKey`.
- [ ] **Branding/Theming** options for the widget.
- [ ] **Unit tests** for retrieval and services.

---

## 📄 License

This project is released under the **MIT License**. See [LICENSE](./LICENSE).
