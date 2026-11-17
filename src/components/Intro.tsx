import React, { useEffect, useMemo, useRef, useState } from 'react';
import deskImg from './intro-desk.webp';
import backImg from './intro-back.webp';
import CFG from './intro-cues.json';
import { LAND, GEO, BENDS } from './introMap';
import { DATA } from '../game/store';
import './intro.css';

/* פתיחה קולנועית (כ־55 שניות) שמתחילה לבד, כמו פרומו לסרט.
   כל התזמון נגזר מטבלת הקריינות intro-cues.json: מעברי שוטים נופלים בהפסקות בין המשפטים. */
const KEY = 'dg-intro-seen';
const CITIES = [
  { name: 'ליסבון', line: 'כאן התחילה הדרך', v: 'lisbon' },
  { name: 'אנטוורפן', line: 'מנהלת את העסקים', v: 'antwerp' },
  { name: 'ונציה', line: 'גם עוצמה אינה מבטיחה ביטחון', v: 'venice' },
  { name: 'פררה', line: 'חיה כיהודייה בגלוי', v: 'ferrara' },
  { name: 'איסטנבול', line: 'נותנת לעוצמה כיוון', v: 'istanbul' },
  { name: 'טבריה', line: 'חזון שחוצה מרחק', v: 'tiberias' },
];
type Cue = { id: string; shot: string; start: number; end: number; text: string; title?: string; kicker?: string };
type R = [number, number];
const SEG = 0.72; // משך כל קטע במסלול המפה
const AUDIO_BASE = './intro/'; // יחסית ל־index.html של הבנייה (גם בתצוגה המקדימה בתת־תיקייה)

/** גוזר את כל ציר הזמן מטבלת הקריינות */
export function timeline(cues: Cue[] = CFG.cues as Cue[]) {
  const c = (id: string) => cues.find(x => x.id === id)!;
  const of = (s: string) => cues.filter(x => x.shot === s);
  const gap = (a: string, b: string) => (of(a).slice(-1)[0].end + of(b)[0].start) / 2; // מעבר באמצע ההפסקה
  const back = gap('desk', 'back'), ship = gap('back', 'ship'), cities = gap('ship', 'cities');
  const nameT = c('n12').start - 0.2, name = nameT - 0.3, map = gap('name', 'map');
  const cityLen = (name - cities) / 6;
  const go = c('n14').end + 0.5;
  return {
    welcome: CFG.welcome as R,
    shots: { desk: [0, back + 0.5] as R, back: [back, ship + 0.4] as R, ship: [ship, cities + 0.6] as R, name: [name, map + 0.4] as R, map: [map, 999] as R },
    cities, cityLen, nameT, map,
    t1510: [c('n1').start - 0.2, c('n2').end + 0.2] as R,
    t2: [c('n7').start - 0.2, c('n8').start - 0.15] as R,
    t3: [c('n8').start, cities - 0.3] as R,
    name: [nameT, map] as R, sub: [c('n13').start - 0.4, map] as R,
    route: map + 0.6, mapKick: map + 0.9, go, final: go + 0.6,
  };
}

export function shouldShowIntro(route: string) {
  if (typeof window === 'undefined') return false;
  if (/[?&]intro(=|&|$)/.test(location.search)) return true;
  if (route !== '') return false;
  try { return !sessionStorage.getItem(KEY); } catch { return false; }
}

/** "{מילה}" בכותרת = הדגשה בזהב */
function rich(t: string) {
  return t.split(/(\{[^}]+\})/).filter(Boolean).map((p, i) => p.startsWith('{') ? <strong key={i}>{p.slice(1, -1)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>);
}

function curve(i: number) {
  const p = GEO[i], q = GEO[i + 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], b = BENDS[i];
  return `M${p[0]} ${p[1]} Q${mx - dy * b} ${my + dx * b} ${q[0]} ${q[1]}`;
}

export function Intro({ onDone }: { onDone: () => void }) {
  const T = useMemo(() => timeline(), []);
  const cueList = CFG.cues as Cue[];
  const A = CFG.audio as { music: string | null; narration: string | null; musicNameAt: number; musicVolume: number; musicUnderNarration: number; narrationVolume: number; narrationAt?: number };
  const hasAudio = !!(A.music || A.narration);
  const reduce = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const [t, setT] = useState(reduce ? T.final : 0);
  const [rolling, setRolling] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sound, setSound] = useState<'off' | 'on' | 'muted'>('off');
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const started = useRef<boolean[]>([]);
  const t0 = useRef(0);
  const tNow = useRef(0);
  const raf = useRef(0);
  const music = useRef<HTMLAudioElement | null>(null);
  const narr = useRef<HTMLAudioElement | null>(null);
  const narrow = useRef(typeof innerWidth !== 'undefined' && innerWidth < 640).current;
  const musicOffset = T.nameT - A.musicNameAt; // אם הקריינות זזה, המוזיקה זזה איתה כך שהשיא נשאר על השם

  useEffect(() => {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* פרטי */ }
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // התחלה אוטומטית: ברגע שתמונת השולחן נטענה (או אחרי 1.5 שניות לכל המאוחר)
  const go0 = useRef(false);
  const begin = () => {
    if (go0.current || reduce) return; go0.current = true; setRolling(true);
    t0.current = performance.now();
    let last = -1;
    const tick = () => {
      const s = (performance.now() - t0.current) / 1000; tNow.current = s; const q = Math.floor(s * 20) / 20;
      if (q !== last) { last = q; setT(q); }
      if (s < T.final + 0.2) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    if (hasAudio) enableSound(true); // ניסיון ניגון אוטומטי
  };
  useEffect(() => { if (reduce) return; const id = window.setTimeout(begin, 1500); return () => clearTimeout(id); }, []); // eslint-disable-line
  useEffect(() => () => { cancelAnimationFrame(raf.current); music.current?.pause(); narr.current?.pause(); }, []);

  // סרטונים: מתחילים בדיוק כשהשוט שלהם מתחיל, ונעצרים אחרי שהוא נעלם
  const cityR = (i: number): R => [T.cities + i * T.cityLen, T.cities + (i + 1) * T.cityLen + (i === 5 ? 0.6 : 0.25)];
  const shots: R[] = [T.shots.ship, ...CITIES.map((_, i) => cityR(i))];
  useEffect(() => {
    if (!rolling || reduce) return;
    shots.forEach(([a, b], i) => {
      const v = vids.current[i]; if (!v) return;
      if (t >= a - 0.3 && !started.current[i]) {
        started.current[i] = true;
        try { v.currentTime = 0; } catch { /* עוד לא נטען */ }
        v.playbackRate = i === 0 ? 0.75 : 0.8; v.play().catch(() => { /* הפוסטר יישאר */ });
      }
      if (t > b + 2 && !v.paused) v.pause();
    });
  }, [t]); // eslint-disable-line

  // קול: מנסים לנגן כבר בטעינה (עובד אם הדפדפן מרשה, למשל אחרי אינטראקציה קודמת באתר).
  // אם נחסם, הנגיעה הראשונה בכל מקום במסך מפעילה את הקול, מסונכרן למיקום הנוכחי בציר הזמן.
  const soundRef = useRef<'off' | 'on' | 'muted'>('off');
  const setS = (v: 'off' | 'on' | 'muted') => { soundRef.current = v; setSound(v); };
  const speaking = (now: number) => !!A.narration && cueList.some(c => now >= c.start - 0.25 && now < c.end + 0.35);
  const musicTarget = (now: number) => (speaking(now) ? A.musicUnderNarration : A.musicVolume);
  const syncAudio = () => {
    const now = tNow.current; const ps: Promise<void>[] = [];
    const m = music.current, n = narr.current;
    if (m) {
      const pos = now - musicOffset;
      if (pos >= 0 && pos < (m.duration || 999)) { if (Math.abs(m.currentTime - pos) > 0.3) { try { m.currentTime = pos; } catch { /* עוד לא נטען */ } } if (m.paused) ps.push(m.play()); }
    }
    if (n) {
      const pos = now - (A.narrationAt || 0);
      if (pos >= 0 && pos < (n.duration || 999)) { if (Math.abs(n.currentTime - pos) > 0.3) { try { n.currentTime = pos; } catch { /* עוד לא נטען */ } } if (n.paused) ps.push(n.play()); }
    }
    return Promise.all(ps);
  };
  const ensureAudio = () => {
    if (A.music && !music.current) { const m = new Audio(AUDIO_BASE + A.music); m.preload = 'auto'; m.volume = musicTarget(tNow.current); m.addEventListener('loadedmetadata', () => { if (soundRef.current === 'on') syncAudio().catch(() => {}); }); music.current = m; }
    if (A.narration && !narr.current) { const n = new Audio(AUDIO_BASE + A.narration); n.preload = 'auto'; n.volume = A.narrationVolume; n.addEventListener('loadedmetadata', () => { if (soundRef.current === 'on') syncAudio().catch(() => {}); }); narr.current = n; }
    (window as unknown as { __dgpAudio?: unknown }).__dgpAudio = { music: music.current, narration: narr.current, musicOffset }; // לבדיקות
  };
  const enableSound = (auto = false) => {
    if (soundRef.current !== 'off') return;
    ensureAudio();
    [music.current, narr.current].forEach(a => { if (a) a.muted = false; });
    setS('on');
    syncAudio().catch(() => { // הדפדפן חסם ניגון אוטומטי: מחכים לנגיעה
      [music.current, narr.current].forEach(a => a?.pause());
      if (auto) setS('off');
    });
  };
  const toggleMute = () => {
    if (soundRef.current === 'off') return enableSound();
    const mute = soundRef.current === 'on';
    [music.current, narr.current].forEach(a => { if (a) a.muted = mute; });
    setS(mute ? 'muted' : 'on'); if (!mute) syncAudio().catch(() => {});
  };
  // נגיעה ראשונה בכל מקום (חוץ מכפתור הקול עצמו) מפעילה קול
  useEffect(() => {
    if (!hasAudio || reduce) return;
    const h = (e: Event) => { const el = e.target as Element | null; if (el?.closest?.('.dgp-sound')) return; enableSound(); };
    addEventListener('pointerdown', h, true); addEventListener('keydown', h, true);
    return () => { removeEventListener('pointerdown', h, true); removeEventListener('keydown', h, true); };
  }, []); // eslint-disable-line
  // דאקינג: המוזיקה יורדת בעדינות מתחת לקריינות; וסנכרון כל שנייה
  useEffect(() => {
    if (sound !== 'on') return; let k = 0;
    const id = window.setInterval(() => {
      const m = music.current; if (m) { const tg = musicTarget(tNow.current), d = tg - m.volume; m.volume = Math.min(1, Math.max(0, m.volume + Math.sign(d) * Math.min(Math.abs(d), 0.05))); }
      if (++k % 10 === 0) syncAudio().catch(() => {});
    }, 100);
    return () => clearInterval(id);
  }, [sound]); // eslint-disable-line

  const fadeOutAudio = () => {
    const as = [music.current, narr.current].filter(Boolean) as HTMLAudioElement[];
    const v0 = as.map(a => a.volume); let k = 0;
    const id = window.setInterval(() => { k++; as.forEach((a, i) => { a.volume = Math.max(0, v0[i] * (1 - k / 10)); }); if (k >= 10) { clearInterval(id); as.forEach(a => a.pause()); } }, 80);
  };
  const close = () => {
    if (leaving) return; setLeaving(true);
    vids.current.forEach(v => v?.pause()); fadeOutAudio();
    window.setTimeout(onDone, reduce ? 0 : 900);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); });

  const on = (r: R) => t >= r[0] && t < r[1];
  const run = (a: number) => rolling && t >= a;
  const vb = narrow ? '52 50 676 352' : '0 0 800 450';
  const goOn = t >= T.go;
  const opened = run(0.5);

  return <div className={'dgp' + (rolling ? ' rolling' : '') + (leaving ? ' out' : '') + (reduce ? ' still' : '')} dir="rtl" lang="he" role="dialog" aria-modal="true" aria-label="פתיחה: מסע בעקבות דונה גרציה" data-t={t}>
    {/* שוט 1: שולחן המכתבים לאור הנר. המכתב "נפתח" לבד: אור חם מתפשט מהחותם והמצלמה נכנסת פנימה */}
    <div className={'dgp-shot desk' + (reduce || on(T.shots.desk) ? ' on' : '') + (run(0) ? ' run' : '') + (opened ? ' opened' : '')}>
      <img className="dgp-img desk-img" src={deskImg} alt="" onLoad={begin} />
      <div className="dgp-candle" aria-hidden="true" />
      <div className="dgp-bloom" aria-hidden="true" />
      <div className="dgp-dust" aria-hidden="true" />
      <div className="dgp-shade desk" />
    </div>
    {/* שוט 2: הגב שלה מול החלון */}
    <div className={'dgp-shot' + (on(T.shots.back) ? ' on' : '') + (run(T.shots.back[0]) ? ' run' : '')}>
      <img className="dgp-img kb-in" src={backImg} alt="" />
      <div className="dgp-shade low" />
    </div>
    {/* שוט 3: הספינה */}
    <div className={'dgp-shot' + (on(T.shots.ship) ? ' on' : '') + (run(T.shots.ship[0]) ? ' run' : '')}>
      <video ref={el => (vids.current[0] = el)} className="dgp-vid kb-v ship" src={`${DATA}videos/opening.mp4`} poster={`${DATA}videos/opening.jpg`} muted playsInline preload="auto" />
      <div className="dgp-shade low" />
    </div>
    {/* שש הערים */}
    {CITIES.map((c, i) => <div key={c.v} className={'dgp-shot city' + (on(cityR(i)) ? ' on' : '') + (run(cityR(i)[0]) ? ' run' : '')}>
      <video ref={el => (vids.current[i + 1] = el)} className={'dgp-vid ' + (i % 2 ? 'kb-v2' : 'kb-v')} src={`${DATA}videos/${c.v}.mp4`} poster={`${DATA}videos/${c.v}.jpg`} muted playsInline preload="auto" />
      <div className="dgp-shade low" />
    </div>)}
    {/* שוט 5: שוב הגב, השם בזהב */}
    <div className={'dgp-shot' + (on(T.shots.name) ? ' on' : '') + (run(T.shots.name[0]) ? ' run' : '')}>
      <img className="dgp-img kb-out" src={backImg} alt="" />
      <div className="dgp-shade name" />
    </div>
    {/* שוט 6: המפה */}
    <div className={'dgp-shot map' + (on(T.shots.map) || reduce ? ' on' : '') + (run(T.route) || reduce ? ' run' : '')}>
      <div className="dgp-mapwrap">
        <p className={'dgp-kick map-k' + (run(T.mapKick) || reduce ? ' in' : '')}>מליסבון ועד טבריה</p>
        <svg className="dgp-map" viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs><filter id="dgpglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <g className="dgp-cam"><g className="dgp-land">{LAND.map((d, i) => <path key={i} d={d} />)}</g>
          {GEO.slice(0, -1).map((_, i) => <g key={i}>
            <path d={curve(i)} className={'dgp-rbase' + (i === 4 ? ' vision' : '')} />
            <path d={curve(i)} pathLength={1} className={'dgp-route' + (i === 4 ? ' vision' : '')} filter="url(#dgpglow)" style={{ transitionDelay: `${i * SEG}s` }} />
          </g>)}
          {GEO.map((g, i) => {
            const up = i === 3 ? 26 : i === 0 ? 6 : -16, lx = i === 0 ? 14 : 0;
            return <g key={i} className="dgp-pin" transform={`translate(${g[0]} ${g[1]})`} style={{ transitionDelay: `${i === 0 ? 0 : (i - 1) * SEG + SEG * .9}s` }}>
              <circle className="ring" r="8" /><circle className="dot" r="3.4" />
              <text x={lx} y={up} textAnchor={i === 0 ? 'start' : 'middle'}>{CITIES[i].name}</text>
            </g>;
          })}
        </g></svg>
        <div className={'dgp-go' + (goOn ? ' on' : '')}>
          <button type="button" className="cta" onClick={close} tabIndex={goOn ? 0 : -1} aria-hidden={!goOn}><span>יוצאות למסע</span><b>←</b></button>
        </div>
      </div>
    </div>

    <div className="dgp-grain" aria-hidden="true" />

    {/* כותרות: כל משפט קריינות מופיע ככותרת אחת, מסונכרן לקול. טקסט אחד בכל רגע, באותו סגנון ובאותו מקום */}
    <div className="dgp-titles" aria-live="polite">
      <div className={'dgp-card' + (on(T.welcome) ? ' in' : '')}>
        <i className="rule" /><h2>ברוכות הבאות למסע</h2><p className="dgp-kick">מסע בעקבות דונה גרציה</p><i className="rule" />
      </div>
      {cueList.map((c, i) => {
        const next = cueList[i + 1];
        const until = Math.min(c.end + 0.7, next ? next.start - 0.35 : c.end + 0.7, c.id === 'n14' ? T.go - 0.2 : 999);
        return <div key={c.id} className={'dgp-card' + (c.id === 'n12' ? ' name' : '') + (on([c.start - 0.2, until]) ? ' in' : '')}>
          <h2>{rich(c.title || c.text)}</h2>{c.kicker && <p className="dgp-kick">{c.kicker}</p>}
        </div>;
      })}
    </div>

    {/* פסי קולנוע */}
    <div className="dgp-bar top" aria-hidden="true" /><div className="dgp-bar bot" aria-hidden="true" />

    {hasAudio && !reduce && <button type="button" className={'dgp-sound ' + sound} onClick={toggleMute} aria-pressed={sound === 'on'} aria-label={sound === 'off' ? 'לחצו לשמע' : sound === 'on' ? 'השתקה' : 'ביטול השתקה'}>
      <span className="ic" aria-hidden="true">{sound === 'muted' ? '🔇' : '🔊'}</span>{sound === 'off' && <span>לחצו לשמע</span>}
    </button>}
    <button type="button" className="dgp-skip" onClick={close}>דילוג</button>
  </div>;
}
