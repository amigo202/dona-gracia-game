import { useEffect, useState, useCallback } from 'react';
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
export function isUnlocked(s: GameState, i: number) { return i === 0 || !!s.stations[SLUGS[i - 1]]?.done; }
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

/* קריינות הדגמה: Web Speech API בעברית */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const stop = useCallback(() => { if (supported) window.speechSynthesis.cancel(); setPlaying(false); }, [supported]);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  const speak = useCallback((text: string) => {
    if (!supported) { setNote('הדפדפן הזה אינו תומך בקריינות. אפשר לקרוא את הטקסט, או לנסות בכרום או בספארי.'); return; }
    const synth = window.speechSynthesis;
    if (playing) { stop(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL'; u.rate = 0.95;
    const voices = synth.getVoices();
    const he = voices.find(v => /^he|^iw/i.test(v.lang));
    if (he) u.voice = he;
    else if (voices.length) setNote('לא נמצא קול עברי במכשיר. ייתכן שההקראה לא תישמע; אפשר להתקין קול עברי בהגדרות המכשיר.');
    u.onstart = () => { setPlaying(true); setProgress(0); };
    u.onboundary = e => setProgress(Math.min(100, Math.round(100 * (e.charIndex / text.length))));
    u.onend = () => { setPlaying(false); setProgress(100); };
    u.onerror = () => { setPlaying(false); setNote('הקריינות לא הצליחה להתנגן במכשיר הזה. אפשר לקרוא את הטקסט.'); };
    setNote(''); setPlaying(true);
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
