import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import fetch from 'node-fetch';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

type DocChunk = {
  _id: string;
  siteKey: string;
  chunk: string;
  createdAt: string;
};

@Injectable()
export class AskService {
  constructor(
    @InjectModel('DocChunk') private docChunkModel: Model<DocChunk>,
  ) {}

  // --- tiny helpers ---
  private tokenize(s: string): string[] {
    return (s || '')
      .toLowerCase()
      .split(/[^a-z0-9áéíóúâêîôûãõç]+/i)
      .filter(Boolean);
  }

  private overlapScore(qTokens: Set<string>, text: string): number {
    const t = this.tokenize(text);
    const textSet = new Set(t);
    let k = 0;
    qTokens.forEach(tok => { if (textSet.has(tok)) k++; });
    return k / Math.max(1, qTokens.size);
  }

  async answerQuestion(siteKey: string, question: string) {
    if (!siteKey) return { error: 'Missing x-site-key header' };
    if (!question || !question.trim()) return { error: 'Missing question in request body' };

    // 1) tokenize question and build a regex OR to prefilter candidates
    const qTokensArr = this.tokenize(question);
    const qTokens = new Set(qTokensArr);

    // Build a loose $or of regex terms to narrow candidates
    const orTerms = Array.from(qTokens)
      .filter(tok => tok.length >= 3)      // ignore tiny words
      .slice(0, 8)                         // cap to keep query light
      .map(tok => ({ chunk: { $regex: tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));

    let candidates: DocChunk[] = [];

    if (orTerms.length) {
      // fetch candidates that contain at least one token
      candidates = await this.docChunkModel
        .find({ siteKey, $or: orTerms })
        .sort({ createdAt: -1 })
        .limit(200)                         // keep it bounded
        .lean();
    }

    // Fallback if no candidates by regex
    if (!candidates.length) {
      candidates = await this.docChunkModel
        .find({ siteKey })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    if (!candidates.length) {
      return { error: 'No documents found for this siteKey' };
    }

    // 2) score by keyword overlap and take top N
    const scored = candidates
      .map(c => ({ doc: c, score: this.overlapScore(new Set(qTokens), c.chunk) }))
      .sort((a, b) => b.score - a.score);

    const top = (scored.length ? scored.slice(0, 5) : scored).filter(x => x.score > 0 || scored.length <= 5);
    const contextText = top.map(x => x.doc.chunk).join('\n---\n');
    const confidenceScore = top[0]?.score ?? 0;

    // 3) build prompt — reply in the same language as the question
const prompt = [
  'You are a helpful assistant.',
  '1) Detect the language of the user question.',
  '2) Answer STRICTLY in the same language as the question.',
  '3) Use ONLY the information in CONTEXT. If the answer is not in the context, say you are not sure and suggest leaving contact details.',
  'Keep answers concise and helpful.',
  '',
  '=== CONTEXT START ===',
  contextText || '(no relevant context found)',
  '=== CONTEXT END ===',
  '',
  `QUESTION: """${question}"""`,
  'ANSWER (use the same language as the QUESTION):'
].join('\n');


    // 4) ask Ollama (llama3)
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => String(response.status));
      return { error: 'Failed to reach Ollama', status: response.status, message: msg };
    }

    const data = (await response.json()) as OllamaResponse;

    // Force low confidence for testing
    const confidence = 0.2; // override here

    // Return answer
    return {
      answer: data.response || 'No answer generated',
      confidence,
      usedChunks: top.length,
      sources: top.map(x => x.doc._id),
    };
  }
}
