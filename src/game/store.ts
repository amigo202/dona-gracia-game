import { useEffect, useState, useCallback, useRef } from 'react';
export type StationProgress = { done: boolean; score: number; dilemma: number; game: number; choice: number };
export type GameState = { name: string; stations: Record<string, StationProgress>; started?: string; finished?: string };
const KEY = 'dona-gracia-game-v1';
const empty: GameState = { name: '', stations: {} };
function load(): GameState {
  try { const raw = localStorage.getItem(KEY); if (!raw) return { ...empty }; const v = JSON.parse(raw); return { ...empty, ...v, stations: v.stations || {} }; }
  catch { return { ...empty }; }
}
let state: GameState = typeof window !== 'undefined' ? load() : { ...empty };
const subs = new Set<() => void>();
export function setGame(fn: (s: GameState) => GameState) {
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* מצב פרטי: ממשיכות בלי שמירה */ }
  subs.forEach(f => f());
}
export function resetGame() { setGame(() => ({ ...empty })); }
export function useGame(): GameState {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(x => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return state;
}
export const SLUGS = ['lisbon', 'antwerp', 'venice', 'ferrara', 'istanbul', 'tiberias'];
export function isUnlocked(_s: GameState, _i: number) { return true; }
export function totalScore(s: GameState) { return SLUGS.reduce((a, k) => a + (s.stations[k]?.score || 0), 0); }
export function doneCount(s: GameState) { return SLUGS.filter(k => s.stations[k]?.done).length; }
export function nextIndex(s: GameState) { const i = SLUGS.findIndex(k => !s.stations[k]?.done); return i; }
export function stars(score: number) { return score >= 90 ? 3 : score >= 70 ? 2 : 1; }

export function useHashRoute(): [string, (r: string) => void] {
  const get = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [r, setR] = useState(get());
  useEffect(() => { const f = () => setR(get()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  const go = useCallback((to: string) => { location.hash = '/' + to; }, []);
  return [r, go];
}

function isHebrewVoice(v: SpeechSynthesisVoice) {
  return /^(he|iw)([-_]|$)/i.test(v.lang) || /hebrew|עברית/i.test(`${v.name} ${v.voiceURI}`);
}

function femaleHebrewScore(v: SpeechSynthesisVoice) {
  const label = `${v.name} ${v.voiceURI} ${v.lang}`;
  if (/hila|carmit|female|woman|girl|\bfe\b|אישה|נשית/i.test(label)) return 3;
  if (/google\s*(עברית|hebrew)|microsoft\s*(hila|עברית|hebrew)/i.test(label)) return 2;
  return isHebrewVoice(v) ? 1 : 0;
}

function pickHebrewVoice(voices: SpeechSynthesisVoice[]) {
  const scored = voices
    .filter(isHebrewVoice)
    .map(voice => ({ voice, score: femaleHebrewScore(voice) }))
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { voice: null as SpeechSynthesisVoice | null, raisePitch: false };
  return { voice: scored[0].voice, raisePitch: scored[0].score < 2 };
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const have = synth.getVoices();
  if (have.length) return Promise.resolve(have);
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', finish);
    window.setTimeout(finish, 1500);
  });
}

/* קריינות הדגמה: Web Speech API בעברית, עם העדפה לקול נשי */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const genRef = useRef(0);
  const stop = useCallback(() => {
    genRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setPlaying(false);
  }, [supported]);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  const speak = useCallback(async (text: string) => {
    if (!supported) { setNote('הדפדפן הזה אינו תומך בקריינות. אפשר לקרוא את הטקסט, או לנסות בכרום או בספארי.'); return; }
    const synth = window.speechSynthesis;
    if (playing) { stop(); return; }
    const gen = ++genRef.current;
    synth.cancel();
    setNote('');
    setPlaying(true);
    setProgress(0);
    const voices = await loadVoices();
    if (gen !== genRef.current) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    u.rate = 0.95;
    const { voice, raisePitch } = pickHebrewVoice(voices);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang || 'he-IL';
      u.pitch = raisePitch ? 1.2 : 1;
    } else {
      u.pitch = 1.2;
      if (voices.length) setNote('לא נמצא קול עברי במכשיר. ייתכן שההקראה לא תישמע; אפשר להתקין קול עברי בהגדרות המכשיר.');
    }
    u.onstart = () => { if (gen === genRef.current) { setPlaying(true); setProgress(0); } };
    u.onboundary = e => { if (gen === genRef.current) setProgress(Math.min(100, Math.round(100 * (e.charIndex / text.length)))); };
    u.onend = () => { if (gen === genRef.current) { setPlaying(false); setProgress(100); } };
    u.onerror = () => {
      if (gen !== genRef.current) return;
      setPlaying(false);
      setNote('הקריינות לא הצליחה להתנגן במכשיר הזה. אפשר לקרוא את הטקסט.');
    };
    synth.speak(u);
  }, [supported, playing, stop]);
  return { supported, playing, progress, note, speak, stop };
}
export function shuffle<T>(a: T[], seed = 7): T[] {
  const r = a.slice(); let x = seed;
  for (let i = r.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** תיקיית הקבצים הסטטיים (סרטונים, הקלטות, contributions.json). בגרסת תצוגה מקדימה בתת־תיקייה: VITE_DATA_BASE=../ */
export const DATA: string = (import.meta.env.VITE_DATA_BASE as string | undefined) || './';
