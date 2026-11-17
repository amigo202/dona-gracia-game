import React, { useEffect, useRef, useState } from 'react';
import { narration } from './narration';
import { useStudio, contributionsFor, addContribution, removeContribution, creditNames, bakedMedia, getRec, putRec, delRec, exportAll, importAll, shrinkImage, download, extOf, Rec } from './studio';
import { useSpeech, SLUGS } from './store';

export const PrivacyNote = ({ compact }: { compact?: boolean }) => <p className={'privacy-note' + (compact ? ' compact' : '')} role="note">
  <b>🔒 פרטיות:</b> כותבות <b>שמות פרטיים בלבד</b>, בלי שם משפחה, כיתה או בית ספר. קול, תמונה או סרטון של תלמידה עולים לגרסה הציבורית רק אחרי <b>אישור הורים</b>.
</p>;

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* כרטיסי «החוקרות שלנו» שמוצגים בתחנה */
export function ResearchCards({ slug }: { slug: string }) {
  useStudio(); const list = contributionsFor(slug);
  if (!list.length) return <div className="rc-empty"><span className="avatar">?</span><p>כאן יופיעו הכרטיסים של החוקרות שלנו: מה מצאתן על התחנה, ומאיזה מקור.</p></div>;
  return <ul className="rc-list">{list.map(c => <li key={c.id} className={'rc-card' + (c.baked ? '' : ' local')}>
    {c.image && <img src={c.image} alt={`תמונה שצירפו ${c.names}`} loading="lazy" />}
    <div className="rc-who"><span className="avatar">{c.names.trim().slice(0, 1) || '✦'}</span><b>{c.names}</b></div>
    <p className="rc-fact">{c.fact}</p>
    {c.source && <small className="rc-src">מקור: {isUrl(c.source) ? <a href={c.source} target="_blank" rel="noopener noreferrer">{c.source.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42)}</a> : c.source}</small>}
    {!c.baked && <div className="rc-local"><span>שמור רק במכשיר הזה</span><button type="button" className="linkish" onClick={() => { if (confirm('למחוק את הכרטיס מהמכשיר?')) removeContribution(c.id); }}>מחיקה</button></div>}
  </li>)}</ul>;
}

function ResearchForm({ slug, flash }: { slug: string; flash: (t: string) => void }) {
  const [names, setNames] = useState(''); const [fact, setFact] = useState(''); const [source, setSource] = useState(''); const [image, setImage] = useState<string | undefined>(); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => { if (!f) return; setBusy(true); setErr(''); try { setImage(await shrinkImage(f)); } catch { setErr('לא הצלחנו לקרוא את התמונה. נסו קובץ JPG או PNG.'); } setBusy(false); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (names.trim().length < 2 || fact.trim().length < 10 || source.trim().length < 3) { setErr('צריך למלא שם, עובדה (לפחות משפט אחד) ומקור.'); return; }
    if (!addContribution({ station: slug, names: names.trim(), fact: fact.trim(), source: source.trim(), image })) { setErr('אין מספיק מקום במכשיר. נסו בלי תמונה, או ייצאו ומחקו כרטיסים ישנים.'); return; }
    setFact(''); setSource(''); setImage(undefined); if (fileRef.current) fileRef.current.value = ''; setErr('');
    flash('הכרטיס נשמר ומופיע בתחנה. כדי שכולם יראו אותו: סטודיו הכיתה ← ייצוא.');
  };
  return <form className="rc-form" onSubmit={submit}>
    <label><span>שם הקבוצה או שמות פרטיים (מופרדים בפסיק)</span><input value={names} onChange={e => setNames(e.target.value)} maxLength={80} placeholder="למשל: נועה, מיכל" autoComplete="off" /></label>
    <label><span>מה גיליתן? עובדה אחת, במילים שלכן</span><textarea value={fact} onChange={e => setFact(e.target.value)} maxLength={420} rows={3} placeholder="עובדה שמצאתן במקור, במשפט או שניים" /><small className="count">{fact.length}/420</small></label>
    <label><span>מקור (קישור או שם הספר/האתר)</span><input value={source} onChange={e => setSource(e.target.value)} maxLength={300} placeholder="https://…" dir="auto" /></label>
    <div className="rc-img">
      <label className="file-btn"><input ref={fileRef} type="file" accept="image/*" onChange={e => pick(e.target.files?.[0])} /><span>🖼️ {image ? 'החלפת תמונה' : 'הוספת תמונה (לא חובה)'}</span></label>
      {busy && <small>מכינה…</small>}
      {image && <><img src={image} alt="תצוגה מקדימה" /><button type="button" className="linkish" onClick={() => { setImage(undefined); if (fileRef.current) fileRef.current.value = ''; }}>הסרה</button></>}
    </div>
    <p className="hint">תמונה: רק כזו שצילמתן בעצמכן או שמותר להשתמש בה, ובלי פנים של תלמידות.</p>
    {err && <p className="form-err" role="alert">{err}</p>}
    <button type="submit" className="cta small"><span>שמירת הכרטיס בתחנה</span><b>+</b></button>
  </form>;
}

/* טלפרומפטר */
function Teleprompter({ slug, kind, setKind, running }: { slug: string; kind: 'script' | 'letter'; setKind: (k: 'script' | 'letter') => void; running: boolean }) {
  const n = narration[slug]; const box = useRef<HTMLDivElement>(null); const [size, setSize] = useState(22);
  useEffect(() => {
    const el = box.current; if (!el) return; if (!running) return; el.scrollTop = 0;
    const total = kind === 'script' ? 36000 : 24000; const t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const p = Math.min(1, (t - t0 - 2500) / total); if (p > 0) el.scrollTop = p * (el.scrollHeight - el.clientHeight); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [running, kind]);
  const text = kind === 'script' ? n.script : n.letter; const words = text.split(/\s+/).length;
  return <div className="prompter">
    <div className="pr-tabs" role="tablist" aria-label="מה מקליטות">
      <button type="button" role="tab" aria-selected={kind === 'script'} className={kind === 'script' ? 'on' : ''} onClick={() => setKind('script')}>טקסט הקריינות</button>
      <button type="button" role="tab" aria-selected={kind === 'letter'} className={kind === 'letter' ? 'on' : ''} onClick={() => setKind('letter')}>מכתב מדונה גרציה</button>
      <span className="pr-size"><button type="button" aria-label="הקטנת הטקסט" onClick={() => setSize(s => Math.max(16, s - 2))}>א−</button><button type="button" aria-label="הגדלת הטקסט" onClick={() => setSize(s => Math.min(34, s + 2))}>א+</button></span>
    </div>
    {kind === 'letter' && <p className="pr-label">✍️ כתיבה יצירתית בגוף ראשון, לא ציטוט היסטורי. כך מציגים אותה גם בהקלטה.</p>}
    <div ref={box} className={'pr-text' + (running ? ' running' : '')} style={{ fontSize: size }} tabIndex={0} aria-label="טקסט להקראה"><p>{text}</p></div>
    <small className="pr-meta">{words} מילים · בערך {kind === 'script' ? '30–40' : '20–25'} שניות בקצב רגוע{running ? ' · הטקסט גולל לבד' : ''}</small>
  </div>;
}

function pickMime() {
  const MR = (window as any).MediaRecorder; if (!MR?.isTypeSupported) return '';
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MR.isTypeSupported(t)) || '';
}
const MAX_SECS = 180;

export function Recorder({ slug, city, flash }: { slug: string; city: string; flash: (t: string) => void }) {
  const [rec, setRec] = useState<Rec | null>(null); const [url, setUrl] = useState(''); const [state, setState] = useState<'idle' | 'asking' | 'recording'>('idle');
  const [secs, setSecs] = useState(0); const [err, setErr] = useState(''); const [kind, setKind] = useState<'script' | 'letter'>('script'); const [names, setNames] = useState('');
  const mr = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const timer = useRef(0); const stream = useRef<MediaStream | null>(null);
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof (window as any).MediaRecorder !== 'undefined';
  useEffect(() => { let on = true; getRec(slug).then(r => { if (on && r) { setRec(r); setNames(r.names || ''); setKind(r.kind || 'script'); } }); return () => { on = false; }; }, [slug]);
  useEffect(() => { if (!rec) { setUrl(''); return; } const u = URL.createObjectURL(rec.blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [rec]);
  useEffect(() => () => { window.clearInterval(timer.current); stream.current?.getTracks().forEach(t => t.stop()); if (mr.current?.state === 'recording') mr.current.stop(); }, []);
  const stop = () => { window.clearInterval(timer.current); if (mr.current?.state === 'recording') mr.current.stop(); };
  const start = async () => {
    setErr('');
    if (!supported) { setErr(window.isSecureContext === false ? 'הקלטה עובדת רק בכתובת מאובטחת (https).' : 'הדפדפן הזה לא תומך בהקלטה. נסו כרום או ספארי מעודכנים, או הקליטו באפליקציית ההקלטות של הטלפון והעלו את הקובץ כאן למטה.'); return; }
    if (rec && !confirm('יש כבר הקלטה לתחנה הזו. להקליט מחדש ולהחליף אותה?')) return;
    window.speechSynthesis?.cancel?.();
    setState('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints });
      stream.current = s; const mime = pickMime();
      const m = new MediaRecorder(s, mime ? { mimeType: mime } : undefined); mr.current = m; chunks.current = [];
      m.ondataavailable = e => { if (e.data && e.data.size) chunks.current.push(e.data); };
      m.onstop = async () => {
        s.getTracks().forEach(t => t.stop()); setState('idle');
        const type = m.mimeType || mime || chunks.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunks.current, { type });
        if (blob.size < 800) { setErr('ההקלטה יצאה ריקה. בדקו שהמיקרופון לא מושתק ונסו שוב.'); return; }
        const r: Rec = { station: slug, mime: type, names: names.trim(), kind, createdAt: new Date().toISOString(), duration: secsRef.current, blob };
        try { await putRec(r); flash('ההקלטה נשמרה במכשיר והיא הקריינות של התחנה עכשיו.'); } catch { flash('ההקלטה מוכנה, אבל לא נשמרה במכשיר (מצב גלישה פרטית?). הורידו אותה כדי לא לאבד.'); }
        setRec(r);
      };
      m.start(1000); setState('recording'); setSecs(0); secsRef.current = 0;
      const t0 = Date.now(); timer.current = window.setInterval(() => { const v = (Date.now() - t0) / 1000; secsRef.current = Math.round(v); setSecs(v); if (v >= MAX_SECS) stop(); }, 250);
    } catch (e: any) {
      setState('idle');
      const n = e?.name || '';
      setErr(n === 'NotAllowedError' || n === 'SecurityError' ? 'לא ניתנה גישה למיקרופון. כדי לאשר: לחצו על סמל המנעול או ה־aA ליד הכתובת, אפשרו מיקרופון, ונסו שוב.'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'לא נמצא מיקרופון במכשיר הזה.'
        : n === 'NotReadableError' ? 'המיקרופון תפוס באפליקציה אחרת (למשל שיחה או זום). סגרו אותה ונסו שוב.'
        : 'ההקלטה לא הצליחה להתחיל במכשיר הזה. אפשר להקליט באפליקציית ההקלטות של הטלפון ולהעלות את הקובץ כאן למטה.');
    }
  };
  const secsRef = useRef(0);
  const upload = async (f?: File) => {
    if (!f) return; if (!/^audio\//.test(f.type) && !/\.(m4a|mp3|wav|webm|ogg|aac)$/i.test(f.name)) { setErr('זה לא נראה כמו קובץ שמע.'); return; }
    if (f.size > 15e6) { setErr('הקובץ גדול מדי (מעל 15MB). הקליטו קטע קצר יותר.'); return; }
    const r: Rec = { station: slug, mime: f.type || 'audio/mp4', names: names.trim(), kind, createdAt: new Date().toISOString(), blob: f };
    try { await putRec(r); setRec(r); setErr(''); flash('הקובץ נשמר והוא הקריינות של התחנה עכשיו.'); } catch { setErr('לא הצלחנו לשמור את הקובץ במכשיר.'); }
  };
  const remove = async () => { if (!confirm('למחוק את ההקלטה מהמכשיר? התחנה תחזור לקול ההדגמה.')) return; await delRec(slug); setRec(null); };
  const saveNames = async () => { if (rec && rec.names !== names.trim()) { const r = { ...rec, names: names.trim() }; await putRec(r); setRec(r); } };
  return <div className="recorder">
    <Teleprompter slug={slug} kind={kind} setKind={setKind} running={state === 'recording'} />
    <div className="rec-panel">
      <label className="rec-names"><span>מי מקליטה? (שם פרטי בלבד)</span><input value={names} onChange={e => setNames(e.target.value)} onBlur={saveNames} maxLength={60} placeholder="למשל: שירה" /></label>
      <div className="rec-row">
        {state === 'recording'
          ? <button type="button" className="mic on" onClick={stop} aria-label="עצירת ההקלטה"><span className="mic-ico">■</span><span>עצירה</span></button>
          : <button type="button" className="mic" onClick={start} disabled={state === 'asking'} aria-label={rec ? 'הקלטה מחדש' : 'התחלת הקלטה'}><span className="mic-ico">🎙️</span><span>{state === 'asking' ? 'מבקשת גישה…' : rec ? 'הקלטה מחדש' : 'התחלת הקלטה'}</span></button>}
        <div className={'rec-time' + (state === 'recording' ? ' live' : '')} aria-live="polite">{state === 'recording' ? <><i />{fmt(secs)}</> : rec ? `הקלטה של ${fmt(rec.duration || 0)}`.replace('0:00', '—') : 'עוד אין הקלטה'}</div>
      </div>
      {err && <p className="form-err" role="alert">{err}</p>}
      {rec && url && state !== 'recording' && <div className="rec-done">
        <audio src={url} controls preload="metadata" />
        <div className="rec-actions">
          <button type="button" className="ghost sm" onClick={() => download(rec.blob, `${slug}-${rec.kind === 'letter' ? 'letter' : 'narration'}.${extOf(rec.mime)}`)}>⬇ הורדת הקובץ</button>
          <button type="button" className="linkish" onClick={remove}>מחיקה</button>
        </div>
        <small className="hint">{rec.kind === 'letter' ? 'מוקלט: מכתב מדונה גרציה (כתיבה יצירתית).' : 'מוקלט: טקסט הקריינות.'} ההקלטה מחליפה את קול ההדגמה בתחנת {city}, במכשיר הזה.</small>
      </div>}
      <label className="file-btn alt"><input type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg" onChange={e => upload(e.target.files?.[0])} /><span>או העלאת קובץ הקלטה מוכן</span></label>
      <ul className="rec-tips"><li>חדר שקט, טלפון במרחק של כף יד מהפה.</li><li>קוראות לאט וברור. מותר לעצור ולהקליט שוב.</li><li>ההקלטה נעצרת לבד אחרי 3 דקות.</li></ul>
    </div>
  </div>;
}

const urlCache: Record<string, string> = {};
/* הקריינות בתחנה: הקלטה מקומית ← קובץ אפוי ← קול הדגמה של הדפדפן */
export function Narrator({ slug, text }: { slug: string; text: string }) {
  const st = useStudio(); const meta = st.recIndex[slug]; const [src, setSrc] = useState(''); const [from, setFrom] = useState<'local' | 'baked' | ''>('');
  useEffect(() => {
    let on = true;
    (async () => {
      const r = await getRec(slug);
      if (r && on) { const key = slug + r.createdAt; urlCache[key] ||= URL.createObjectURL(r.blob); setSrc(urlCache[key]); setFrom('local'); return; }
      const b = await bakedMedia('audio', slug); if (on) { setSrc(b || ''); setFrom(b ? 'baked' : ''); }
    })();
    return () => { on = false; };
  }, [slug, meta?.createdAt]);
  if (src) return <div className="listen-wrap student-voice">
    <div className="sv-head"><span className="sv-ico" aria-hidden="true">🎙️</span><b>{from === 'local' ? 'הקריינות שלכן' : 'הקריינות של תלמידות הכיתה'}</b>{meta?.names && from === 'local' && <small>· {meta.names}</small>}</div>
    <audio src={src} controls preload="metadata" />
    {meta?.kind === 'letter' && from === 'local' && <p className="voice-note">מכתב בגוף ראשון: כתיבה יצירתית, לא ציטוט היסטורי.</p>}
    {from === 'local' && <p className="voice-note">ההקלטה שמורה במכשיר הזה. כדי שתופיע לכולם: סטודיו הכיתה ← ייצוא.</p>}
  </div>;
  return <SpeechListen text={text} />;
}
function SpeechListen({ text }: { text: string }) {
  const sp = useSpeech();
  return <div className="listen-wrap">
    <button type="button" className={'listen' + (sp.playing ? ' on' : '')} onClick={() => sp.speak(text)} aria-pressed={sp.playing}>
      <span className="ico" aria-hidden="true">{sp.playing ? '❚❚' : '▶'}</span><span>{sp.playing ? 'מקריאה… (לחצו לעצירה)' : 'הקשיבו'}</span><span className="bar" aria-hidden="true"><i style={{ width: sp.progress + '%' }} /></span>
    </button>
    <p className="voice-note">קול הדגמה ממוחשב. הקליטו את התחנה בסטודיו הכיתה למטה, וההקלטה שלכן תחליף אותו.</p>
    {sp.note && <p className="voice-note warn" role="status">{sp.note}</p>}
  </div>;
}

export function StudentVideo({ slug }: { slug: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let on = true; bakedMedia('video', slug).then(v => { if (on) setSrc(v); }); return () => { on = false; }; }, [slug]);
  if (!src) return null;
  return <figure className="st-video student-video"><video src={src} controls playsInline preload="metadata" aria-label="סרטון של תלמידות הכיתה" />
    <figcaption><span className="ai-tag class-tag">סרטון של תלמידות הכיתה</span></figcaption></figure>;
}

/* הסטודיו בתוך התחנה */
export function StudioPanel({ slug, city, flash, go }: { slug: string; city: string; flash: (t: string) => void; go: (r: string) => void }) {
  const [tab, setTab] = useState<'research' | 'record'>('research');
  return <section className="studio" aria-labelledby={'studio-h-' + slug}>
    <div className="studio-head">
      <span className="eyebrow"><i />סטודיו הכיתה</span>
      <h3 id={'studio-h-' + slug}>התחנה של {city} נבנית איתכן</h3>
      <p>כאן מוסיפות את החקר שלכן ומקליטות את הקריינות. מה שתיצרו יופיע בתחנה, ובסוף המסע גם בקרדיטים.</p>
    </div>
    <div className="studio-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'research'} className={tab === 'research' ? 'on' : ''} onClick={() => setTab('research')}>🔎 החוקרות שלנו</button>
      <button type="button" role="tab" aria-selected={tab === 'record'} className={tab === 'record' ? 'on' : ''} onClick={() => setTab('record')}>🎙️ הקלטת קריינות</button>
    </div>
    <div className="studio-body" role="tabpanel">{tab === 'research' ? <ResearchForm slug={slug} flash={flash} /> : <Recorder slug={slug} city={city} flash={flash} />}</div>
    <PrivacyNote compact />
    <button type="button" className="linkish studio-link" onClick={() => go('studio')}>כל התרומות של הכיתה, ייצוא ושליחה ←</button>
  </section>;
}

export function Credits({ title = 'יצרו את הלומדה', className = '' }: { title?: string; className?: string }) {
  useStudio(); const names = creditNames(); if (!names.length) return null;
  return <div className={'credits ' + className}><b>{title}</b><p>{names.join(' · ')}</p></div>;
}

/* עמוד סטודיו הכיתה */
export function StudioPage({ go, flash, cities }: { go: (r: string) => void; flash: (t: string) => void; cities: string[] }) {
  const st = useStudio(); const [busy, setBusy] = useState(false); const inp = useRef<HTMLInputElement>(null);
  const localCount = st.local.length; const recCount = Object.keys(st.recIndex).length;
  const doExport = async () => { setBusy(true); try { const r = await exportAll(SLUGS); flash(`הקובץ ירד: ${r.cards} כרטיסים, ${r.recordings} הקלטות.`); } catch { flash('הייצוא לא הצליח.'); } setBusy(false); };
  const doImport = async (f?: File) => { if (!f) return; setBusy(true); try { const r = await importAll(f); flash(`נוספו ${r.cards} כרטיסים ו־${r.recs} הקלטות.`); } catch { flash('הקובץ לא נקרא. צריך קובץ שיוצא מסטודיו הכיתה.'); } setBusy(false); if (inp.current) inp.current.value = ''; };
  return <div className="view studio-view"><div className="sources card-light studio-page">
    <button type="button" className="back dark" onClick={() => go('map')}>→ חזרה</button>
    <h2>סטודיו הכיתה</h2>
    <p>הלומדה נבנית יחד עם התלמידות. בכל תחנה, בשלב הסיפור, יש <b>סטודיו הכיתה</b>: כרטיס «החוקרות שלנו» לעובדה שמצאתן ולמקור שלה, וכפתור הקלטה עם טקסט קריינות מוכן.</p>
    <ol className="how-steps">
      <li><b>חוקרות ומקליטות</b> בתחנה. הכל נשמר קודם רק במכשיר שעליו עבדתן.</li>
      <li><b>מייצאות</b> קובץ אחד מהמכשיר (הכפתור כאן למטה) ושולחות למורה.</li>
      <li><b>אחרי אישור</b>, התרומות נכנסות לגרסה הציבורית ומופיעות לכל מי שמשחקת.</li>
    </ol>
    <PrivacyNote />
    <h3>מה יש במכשיר הזה</h3>
    <table className="st-table"><thead><tr><th>תחנה</th><th>כרטיסי חקר</th><th>הקלטה</th></tr></thead><tbody>
      {SLUGS.map((k, i) => { const c = contributionsFor(k); const loc = c.filter(x => !x.baked).length; return <tr key={k}>
        <td><button type="button" className="linkish" onClick={() => go(k)}>{cities[i]}</button></td>
        <td>{c.length ? `${c.length}${loc ? ` (${loc} במכשיר)` : ''}` : '—'}</td>
        <td>{st.recIndex[k] ? `✓ ${st.recIndex[k].names || ''}` : '—'}</td></tr>; })}
    </tbody></table>
    <div className="studio-io">
      <button type="button" className="cta" disabled={busy || (!localCount && !recCount)} onClick={doExport}><span>ייצוא התרומות מהמכשיר ({localCount} כרטיסים, {recCount} הקלטות)</span><b>⬇</b></button>
      <label className="ghost dark file-btn big"><input ref={inp} type="file" accept="application/json,.json" onChange={e => doImport(e.target.files?.[0])} /><span>ייבוא קובץ מתלמידה אחרת</span></label>
    </div>
    <p className="small">הייבוא מאחד במכשיר הזה כרטיסים והקלטות מכמה מכשירים, ואז אפשר לייצא את כולם יחד בקובץ אחד.</p>
    <Credits title="התלמידות שיצרו את הלומדה" className="light" />
  </div></div>;
}
