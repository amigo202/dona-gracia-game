import React, { useEffect, useRef, useState } from 'react';
import {
  askDona,
  ChatMessage,
  initialGreeting,
  suggestedQuestions,
} from '../game/donaChat';
import { useSpeech } from '../game/store';

type SpeechRecInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecCtor = new () => SpeechRecInstance;

function getSpeechRecCtor(): SpeechRecCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function DonaChat({
  open,
  onClose,
  stationSlug,
}: {
  open: boolean;
  onClose: () => void;
  stationSlug?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'greet-0', role: 'dona', text: initialGreeting(stationSlug), station: stationSlug },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecInstance | null>(null);
  const speechSupported = !!getSpeechRecCtor();
  const tts = useSpeech();

  useEffect(() => {
    if (!tts.playing) setSpeakingId(null);
  }, [tts.playing]);

  useEffect(() => {
    if (!open) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 160);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setVoiceNote('');
    const userMsg: ChatMessage = {
      id: 'u-' + Date.now() + Math.random().toString(36).slice(2, 6),
      role: 'user',
      text,
      station: stationSlug,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (raw === undefined) setInput('');
    setBusy(true);
    try {
      const { reply } = await askDona(text, nextHistory, stationSlug);
      setMessages(prev => [
        ...prev,
        {
          id: 'd-' + Date.now() + Math.random().toString(36).slice(2, 6),
          role: 'dona',
          text: reply,
          station: stationSlug,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    const Ctor = getSpeechRecCtor();
    if (!Ctor) {
      setVoiceNote('הדיבור הקולי נתמך בדפדפנים כמו Chrome ו־Safari. אפשר להקליד כאן בשמחה.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    setVoiceNote('');
    try {
      const rec = new Ctor();
      rec.lang = 'he-IL';
      rec.interimResults = true;
      rec.continuous = false;
      let latest = '';
      rec.onresult = (e: any) => {
        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0]?.transcript || '';
          if (e.results[i].isFinal) isFinal = true;
        }
        latest = transcript.trim();
        setInput(latest);
        if (isFinal && latest) {
          setListening(false);
          rec.stop();
          setInput('');
          void send(latest);
        }
      };
      rec.onerror = (e: any) => {
        setListening(false);
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          setVoiceNote('יש לאשר גישה למיקרופון בדפדפן כדי לדבר עם דונה, או להקליד שאלה.');
        } else if (e?.error === 'no-speech') {
          setVoiceNote('לא נקלט דיבור. נסי שוב או הקלידי את השאלה.');
        } else {
          setVoiceNote('לא הצלחנו להפעיל זיהוי קולי כרגע. אפשר להקליד כאן.');
        }
      };
      rec.onend = () => {
        setListening(false);
      };
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setVoiceNote('הזיהוי הקולי אינו זמין כרגע בדפדפן זה. אפשר להקליד כאן.');
    }
  };

  const speakReply = (msg: ChatMessage) => {
    if (speakingId === msg.id && tts.playing) {
      tts.stop();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msg.id);
    tts.speak(msg.text);
  };

  if (!open) return null;

  const chips = suggestedQuestions(stationSlug);

  return (
    <div
      className="dc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dc-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="dc-drawer" dir="rtl" lang="he">
        <header className="dc-head">
          <div className="dc-persona">
            <span className="dc-seal" aria-hidden="true">✦</span>
            <div>
              <h2 id="dc-title">כתבו לדונה</h2>
              <p>שאלו את דונה גרציה על המסע, הבחירות והחזון</p>
            </div>
          </div>
          <button
            type="button"
            className="dc-close"
            onClick={onClose}
            aria-label="סגירת השיחה עם דונה"
          >
            ✕
          </button>
        </header>

        <div className="dc-messages" ref={listRef}>
          {messages.map(m => (
            <div key={m.id} className={'dc-msg ' + m.role}>
              <div className="dc-bubble">
                {m.role === 'dona' && <span className="dc-who">דונה גרציה</span>}
                <p>{m.text}</p>
                {m.role === 'dona' && tts.supported && (
                  <button
                    type="button"
                    className={'dc-speak' + (speakingId === m.id && tts.playing ? ' on' : '')}
                    onClick={() => speakReply(m)}
                    aria-label={speakingId === m.id && tts.playing ? 'עצירת הקראה' : 'האזנה לתשובה'}
                  >
                    {speakingId === m.id && tts.playing ? '❚❚ עצירה' : '🔊 הקראה'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="dc-msg dona">
              <div className="dc-bubble typing" aria-label="דונה כותבת">
                <span className="dc-who">דונה גרציה</span>
                <span className="dc-dots"><i /><i /><i /></span>
              </div>
            </div>
          )}
        </div>

        <div className="dc-chips" aria-label="שאלות לדוגמה">
          {chips.map(q => (
            <button
              key={q}
              type="button"
              className="dc-chip"
              onClick={() => void send(q)}
              disabled={busy}
            >
              {q}
            </button>
          ))}
        </div>

        {voiceNote && (
          <p className="dc-note" role="status">
            {voiceNote}
          </p>
        )}

        <form
          className="dc-form"
          onSubmit={e => {
            e.preventDefault();
            void send();
          }}
        >
          <button
            type="button"
            className={'dc-mic' + (listening ? ' on' : '') + (!speechSupported ? ' dim' : '')}
            onClick={toggleVoice}
            aria-pressed={listening}
            aria-label={listening ? 'עצירת דיבור' : 'דיבור בעברית'}
            title={speechSupported ? 'שאלו בקול בעברית' : 'הקלטה קולית אינה נתמכת בדפדפן זה'}
          >
            <span aria-hidden="true">{listening ? '⏹' : '🎙️'}</span>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={listening ? 'מקשיבה בעברית…' : 'כתבו שאלה לדונה גרציה…'}
            maxLength={300}
            aria-label="שאלה לדונה גרציה"
          />
          <button type="submit" className="dc-send" disabled={!input.trim() || busy}>
            שליחה
          </button>
        </form>
      </section>
    </div>
  );
}
