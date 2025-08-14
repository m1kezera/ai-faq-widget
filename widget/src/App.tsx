import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

// Lê primeiro de window (definido pelo embed.js), depois querystring, depois .env, por fim default local
const API_BASE =
  (window as any).__AIWIDGET_API__ ||
  new URLSearchParams(window.location.search).get('api') ||
  process.env.REACT_APP_API_BASE ||
  'https://msie-possibility-daughters-ja.trycloudflare.com';

const SITE_KEY =
  (window as any).__AIWIDGET_SITE_KEY__ ||
  new URLSearchParams(window.location.search).get('siteKey') ||
  'testsite123';


type ChatItem = { role: 'user' | 'bot'; text: string };
type AskResponse = {
  answer: string;
  confidence?: number;
  needsFollowUp?: boolean;
  usedChunks?: number;
  sources?: string[];
};

export default function App() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [lead, setLead] = useState({ name: '', email: '', message: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, showLeadForm, loading]);

  const sendQuestion = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setChat(prev => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await axios.post<AskResponse>(
        `${API_BASE}/ask`,
        { question: q },
        { headers: { 'x-site-key': SITE_KEY } }
      );
      setChat(prev => [...prev, { role: 'bot', text: res.data.answer }]);

      // mostra form de lead se confiança baixa
      const low = typeof res.data.confidence === 'number' && res.data.confidence < 0.35;
      if (res.data.needsFollowUp || low) {
        setShowLeadForm(true);
        setLead(l => ({ ...l, message: `Follow-up to: "${q}"` }));
      }
    } catch (e) {
      setChat(prev => [...prev, { role: 'bot', text: '⚠️ Error contacting server.' }]);
    } finally {
      setLoading(false);
    }
  };

  const sendLead = async () => {
    if (!lead.email.trim()) {
      alert('Please add your email so we can contact you.');
      return;
    }
    try {
      await axios.post(
        `${API_BASE}/leads`,
        lead,
        { headers: { 'x-site-key': SITE_KEY } }
      );
      setChat(prev => [...prev, { role: 'bot', text: '✅ Thanks! We will contact you soon.' }]);
      setShowLeadForm(false);
      setLead({ name: '', email: '', message: '' });
    } catch {
      alert('Failed to send lead');
    }
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          className="faq-fab bounce"
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <span className="fab-dot" />
          <span className="fab-icon">💬</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="faq-panel slide-up">
          <div className="faq-header">
            <div className="title">
              <span className="logo">AI</span> Assistant
            </div>
            <div className={`status ${loading ? 'on' : ''}`}>
              <span className="dot" />
              {loading ? 'Thinking…' : 'Online'}
            </div>
            <button className="close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="faq-body" ref={scrollRef}>
            {chat.length === 0 && (
              <div className="empty">
                Ask anything about your docs. I’ll answer using your context.
              </div>
            )}

            {chat.map((c, i) => (
              <div key={i} className={`bubble ${c.role}`}>
                <div className="bubble-inner">{c.text}</div>
              </div>
            ))}

            {loading && (
              <div className="bubble bot">
                <div className="bubble-inner typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {showLeadForm && (
              <div className="lead-card">
                <div className="lead-title">Didn’t fully answer your question?</div>
                <div className="lead-sub">Leave your contact and we’ll follow up.</div>

                <input
                  className="input"
                  placeholder="Your name"
                  value={lead.name}
                  onChange={e => setLead({ ...lead, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Email*"
                  value={lead.email}
                  onChange={e => setLead({ ...lead, email: e.target.value })}
                />
                <textarea
                  className="input textarea"
                  placeholder="Message"
                  value={lead.message}
                  onChange={e => setLead({ ...lead, message: e.target.value })}
                />
                <div className="lead-actions">
                  <button className="btn ghost" onClick={() => setShowLeadForm(false)}>Not now</button>
                  <button className="btn primary" onClick={sendLead}>Send</button>
                </div>
              </div>
            )}
          </div>

          {!showLeadForm && (
            <div className="faq-input">
              <input
                className="ask"
                placeholder="Ask something…"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendQuestion()}
                disabled={loading}
              />
              <button className="btn primary send" onClick={sendQuestion} disabled={loading}>Send</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
