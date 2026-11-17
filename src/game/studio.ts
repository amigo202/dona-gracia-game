// סטודיו הכיתה: התרומות של התלמידות (כרטיסי חקר, הקלטות, סרטונים).
// מקומי: localStorage (כרטיסים) ו־IndexedDB (הקלטות) — נשמר רק במכשיר שבו נוצר, עד ייצוא.
// אפוי בגרסה הציבורית: public/contributions.json, public/audio/<תחנה>.(m4a|mp3|webm), public/student-video/<תחנה>.mp4
import { useEffect, useState } from 'react';
import { DATA } from './store';

export type Contribution = { id: string; station: string; names: string; fact: string; source: string; image?: string; createdAt: string; baked?: boolean };
export type RecMeta = { station: string; mime: string; names: string; kind: 'script' | 'letter'; createdAt: string; duration?: number };
export type Rec = RecMeta & { blob: Blob };
type Baked = { contributions?: Contribution[]; credits?: string[]; media?: { audio?: Record<string, string>; video?: Record<string, string> } };

const LKEY = 'dona-gracia-contrib-v1';
let local: Contribution[] = (() => { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch { return []; } })();
let baked: Baked = {};
let bakedLoaded = false;
const recIndex: Record<string, RecMeta> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export function useStudio() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(x => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return { local, baked, bakedLoaded, recIndex };
}
function saveLocal() { try { localStorage.setItem(LKEY, JSON.stringify(local)); return true; } catch { return false; } }

export function contributionsFor(station: string): Contribution[] {
  return [...(baked.contributions || []).filter(c => c.station === station).map(c => ({ ...c, baked: true })), ...local.filter(c => c.station === station)];
}
export function addContribution(c: Omit<Contribution, 'id' | 'createdAt'>): boolean {
  const item: Contribution = { ...c, id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), createdAt: new Date().toISOString() };
  local = [...local, item];
  if (!saveLocal()) { local = local.filter(x => x.id !== item.id); return false; }
  emit(); return true;
}
export function removeContribution(id: string) { local = local.filter(c => c.id !== id); saveLocal(); emit(); }

/* שמות לקרדיטים: מכרטיסים (אפויים ומקומיים), מהקלטות ומרשימת credits ידנית */
export function splitNames(s: string) { return s.split(/[,،؛;\n]/).map(x => x.trim()).filter(x => x.length > 1 && x.length < 40); }
export function creditNames(): string[] {
  const all = [...(baked.credits || []), ...(baked.contributions || []).flatMap(c => splitNames(c.names)), ...local.flatMap(c => splitNames(c.names)), ...Object.values(recIndex).flatMap(r => splitNames(r.names || ''))];
  return [...new Set(all)];
}

/* קבצים אפויים */
let probe: Record<string, string | null> = {};
export async function loadBaked() {
  try { const r = await fetch(DATA + 'contributions.json', { cache: 'no-cache' }); if (r.ok) baked = await r.json(); } catch { /* אין קובץ */ }
  bakedLoaded = true; emit();
}
async function exists(url: string) { try { const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' }); return r.ok && !/text\/html/.test(r.headers.get('content-type') || ''); } catch { return false; } }
/** מחזיר כתובת של קובץ אפוי, אם יש. אם ב־contributions.json יש media — סומכים עליו בלי לבדוק בשרת. */
export async function bakedMedia(kind: 'audio' | 'video', station: string): Promise<string | null> {
  const k = kind + ':' + station; if (k in probe) return probe[k];
  if (!bakedLoaded) await loadBaked();
  const m = baked.media?.[kind];
  let found: string | null = null;
  if (m) found = m[station] ? DATA + m[station].replace(/^\.?\//, '') : null;
  else {
    const cands = kind === 'audio' ? ['m4a', 'mp3', 'webm'].map(e => `${DATA}audio/${station}.${e}`) : [`${DATA}student-video/${station}.mp4`];
    for (const c of cands) if (await exists(c)) { found = c; break; }
  }
  probe[k] = found; return found;
}

/* IndexedDB להקלטות */
const DB = 'dona-gracia-audio', STORE = 'recordings';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no-idb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const q = fn(t.objectStore(STORE)); q.onsuccess = () => res(q.result as T); q.onerror = () => rej(q.error); });
}
export async function getRec(station: string): Promise<Rec | null> { try { return (await tx<Rec | undefined>('readonly', s => s.get(station))) || null; } catch { return null; } }
export async function putRec(rec: Rec) { await tx('readwrite', s => s.put(rec, rec.station)); const { blob, ...meta } = rec; recIndex[rec.station] = meta; emit(); }
export async function delRec(station: string) { try { await tx('readwrite', s => s.delete(station)); } catch { /* */ } delete recIndex[station]; emit(); }
export async function loadRecIndex(stations: string[]) {
  for (const st of stations) { const r = await getRec(st); if (r) { const { blob, ...meta } = r; recIndex[st] = meta; } }
  emit();
}

export const extOf = (mime: string) => /mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /mpeg|mp3/.test(mime) ? 'mp3' : 'webm';
export function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
const b64 = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

/* ייצוא וייבוא: קובץ אחד עם הכרטיסים וההקלטות מהמכשיר הזה */
export async function exportAll(stations: string[]) {
  const recordings: (RecMeta & { data: string })[] = [];
  for (const st of stations) { const r = await getRec(st); if (r) { const { blob, ...meta } = r; recordings.push({ ...meta, data: await b64(blob) }); } }
  const payload = { app: 'dona-gracia-game', version: 1, exportedAt: new Date().toISOString(), contributions: local, recordings };
  const d = new Date(); const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  download(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }), `dona-gracia-class-${stamp}.json`);
  return { cards: local.length, recordings: recordings.length };
}
export async function importAll(file: File) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'dona-gracia-game') throw new Error('bad-file');
  const ids = new Set(local.map(c => c.id)); let cards = 0, recs = 0;
  for (const c of (data.contributions || []) as Contribution[]) if (c && c.id && c.station && !ids.has(c.id)) { local.push({ ...c, baked: undefined }); cards++; }
  saveLocal();
  for (const r of data.recordings || []) {
    if (!r?.station || !r.data) continue;
    const blob = await (await fetch(r.data)).blob();
    const { data: _d, ...meta } = r; await putRec({ ...meta, blob }); recs++;
  }
  emit(); return { cards, recs };
}

/* הקטנת תמונה לפני שמירה (localStorage מוגבל לכמה MB) */
export function shrinkImage(file: File, max = 900): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
    img.src = u;
  });
}
