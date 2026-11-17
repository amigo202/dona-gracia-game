import React, { useEffect, useRef, useState } from 'react';
import backImg from './intro-back.webp';
import { LAND, GEO, BENDS } from './introMap';
import { DATA } from '../game/store';
import './intro.css';

/* פתיחה קולנועית איטית (כ־46 שניות), כמו פרומו לסרט. בלי קול: הסרטונים מושתקים ואין מוזיקה. */
const KEY = 'dg-intro-seen';
const CITIES = [
  { name: 'ליסבון', line: 'כאן התחילה הדרך', v: 'lisbon' },
  { name: 'אנטוורפן', line: 'מנהלת את העסקים', v: 'antwerp' },
  { name: 'ונציה', line: 'גם עוצמה אינה מבטיחה ביטחון', v: 'venice' },
  { name: 'פררה', line: 'חיה כיהודייה בגלוי', v: 'ferrara' },
  { name: 'איסטנבול', line: 'נותנת לעוצמה כיוון', v: 'istanbul' },
  { name: 'טבריה', line: 'חזון שחוצה מרחק', v: 'tiberias' },
];
/* ציר זמן בשניות מרגע שבירת החותם */
const CITY0 = 16.6, CITY_LEN = 2.9;
const S = {
  back1: [1.2, 8.6], t1: [2.9, 7.6],
  ship: [9.4, CITY0 + 0.6], t2: [10.3, 13.3], t3: [13.8, 16.4],
  back2: [CITY0 + CITY_LEN * 6 + 0.7, 41.0], name: [CITY0 + CITY_LEN * 6 + 1.7, 40.6], sub: [CITY0 + CITY_LEN * 6 + 2.9, 40.6],
  map: [41.4, 999], route: 42.4, go: 46.6,
};
const FINAL = 47.2;
const SEG = 0.72; // משך כל קטע במסלול

export function shouldShowIntro(route: string) {
  if (typeof window === 'undefined') return false;
  if (/[?&]intro(=|&|$)/.test(location.search)) return true;
  if (route !== '') return false;
  try { return !sessionStorage.getItem(KEY); } catch { return false; }
}

function curve(i: number) {
  const p = GEO[i], q = GEO[i + 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], b = BENDS[i];
  return `M${p[0]} ${p[1]} Q${mx - dy * b} ${my + dx * b} ${q[0]} ${q[1]}`;
}

export function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const [t, setT] = useState(reduce ? FINAL : -1); // ‎-1 = מחכה ללחיצה על החותם
  const [cracked, setCracked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const started = useRef<boolean[]>([]);
  const t0 = useRef(0);
  const raf = useRef(0);
  const narrow = useRef(typeof innerWidth !== 'undefined' && innerWidth < 640).current;

  useEffect(() => {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* פרטי */ }
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const start = () => {
    if (cracked) return; setCracked(true);
    t0.current = performance.now();
    // לחיצה = מחווה: מתחילים לטעון/לנגן את הסרטון הראשון כבר עכשיו כדי שבמובייל לא ייחסם
    vids.current.forEach(v => { if (v) { v.muted = true; v.load(); } });
    let last = -1;
    const tick = () => {
      const s = (performance.now() - t0.current) / 1000; const q = Math.floor(s * 20) / 20;
      if (q !== last) { last = q; setT(q); }
      if (s < FINAL + 0.2) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // הפעלת סרטונים בדיוק כשהשוט שלהם מתחיל, ועצירה אחרי שהוא נעלם
  const shots: [number, number][] = [S.ship as [number, number], ...CITIES.map((_, i) => [CITY0 + i * CITY_LEN, CITY0 + (i + 1) * CITY_LEN + (i === 5 ? 0.6 : 0)] as [number, number])];
  useEffect(() => {
    if (t < 0 || reduce) return;
    shots.forEach(([a, b], i) => {
      const v = vids.current[i]; if (!v) return;
      if (t >= a - 0.25 && !started.current[i]) {
        started.current[i] = true;
        try { v.currentTime = 0; } catch { /* עוד לא נטען */ }
        v.playbackRate = i === 0 ? 0.75 : 0.8; v.play().catch(() => { /* הפוסטר יישאר */ });
      }
      if (t > b + 2 && !v.paused) v.pause();
    });
  }, [t]); // eslint-disable-line

  const close = () => {
    if (leaving) return; setLeaving(true);
    vids.current.forEach(v => v?.pause());
    window.setTimeout(onDone, reduce ? 0 : 900);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); });

  const on = (r: number[]) => t >= r[0] && t < r[1];
  const run = (a: number) => t >= a; // הזום האיטי רץ מרגע שהשוט מתחיל ולא מתאפס כשהוא נעלם
  const vb = narrow ? '28 34 724 382' : '0 0 800 450';
  const goOn = t >= S.go;

  return <div className={'dgp' + (cracked ? ' rolling' : '') + (leaving ? ' out' : '') + (reduce ? ' still' : '')} dir="rtl" lang="he" role="dialog" aria-modal="true" aria-label="פתיחה: מסע בעקבות דונה גרציה">
    {/* שוט 1: הגב שלה מול החלון */}
    <div className={'dgp-shot' + (on(S.back1) ? ' on' : '') + (run(S.back1[0]) ? ' run' : '')}>
      <img className="dgp-img kb-in" src={backImg} alt="" />
      <div className="dgp-shade low" />
    </div>
    {/* שוט 2: הספינה */}
    <div className={'dgp-shot' + (on(S.ship) ? ' on' : '') + (run(S.ship[0]) ? ' run' : '')}>
      <video ref={el => (vids.current[0] = el)} className="dgp-vid kb-v ship" src={`${DATA}videos/opening.mp4`} poster={`${DATA}videos/opening.jpg`} muted playsInline preload="auto" />
      <div className="dgp-shade low" />
    </div>
    {/* שש הערים */}
    {CITIES.map((c, i) => {
      const a = CITY0 + i * CITY_LEN, b = a + CITY_LEN + (i === 5 ? 0.6 : 0);
      return <div key={c.v} className={'dgp-shot city' + (on([a, b]) ? ' on' : '') + (run(a) ? ' run' : '')}>
        <video ref={el => (vids.current[i + 1] = el)} className={'dgp-vid ' + (i % 2 ? 'kb-v2' : 'kb-v')} src={`${DATA}videos/${c.v}.mp4`} poster={`${DATA}videos/${c.v}.jpg`} muted playsInline preload="auto" />
        <div className="dgp-shade low" />
      </div>;
    })}
    {/* שוט 7: שוב הגב, השם */}
    <div className={'dgp-shot' + (on(S.back2) ? ' on' : '') + (run(S.back2[0]) ? ' run' : '')}>
      <img className="dgp-img kb-out" src={backImg} alt="" />
      <div className="dgp-shade name" />
    </div>
    {/* שוט 8: המפה */}
    <div className={'dgp-shot map' + (on(S.map) ? ' on' : '') + (run(S.route) ? ' run' : '')}>
      <div className="dgp-mapwrap">
        <p className={'dgp-kick map-k' + (run(S.map[0] + 0.8) ? ' in' : '')}>מליסבון ועד טבריה</p>
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

    {/* כתוביות */}
    <div className="dgp-titles" aria-live="polite">
      <div className={'dgp-card low' + (on(S.t1) ? ' in' : '')}><p className="dgp-kick">פורטוגל · המאה ה־16</p><h2>שנת 1510. ליסבון.</h2></div>
      <div className={'dgp-card low' + (on(S.t2) ? ' in' : '')}><h2 className="lt">ההיסטוריה זוכרת מלכים.</h2></div>
      <div className={'dgp-card low' + (on(S.t3) ? ' in' : '')}><h2 className="lt">המסע הזה מספר על <strong>מלכה בלי כתר.</strong></h2></div>
      {CITIES.map((c, i) => {
        const a = CITY0 + i * CITY_LEN;
        return <div key={c.v} className={'dgp-card low city-c' + (on([a + 0.45, a + CITY_LEN - 0.15 + (i === 5 ? 0.5 : 0)]) ? ' in' : '')}>
          <p className="dgp-kick">0{i + 1} <i>/</i> 06</p><h2>{c.name}</h2><p className="dgp-line">{c.line}</p>
        </div>;
      })}
      <div className={'dgp-card name-c' + (on(S.name) ? ' in' : '')}>
        <h1>דונה גרציה</h1>
        <p className={'dgp-sub' + (on(S.sub) ? ' in' : '')}>אישה אחת. מסע שחצה גבולות.</p>
      </div>
    </div>

    {/* פסי קולנוע */}
    <div className="dgp-bar top" aria-hidden="true" /><div className="dgp-bar bot" aria-hidden="true" />

    {/* פתיח: מכתב חתום */}
    {!reduce && <div className={'dgp-letter' + (cracked ? ' open' : '')}>
      <div className="dgp-glow" />
      <p className="dgp-kick l-k">פורטוגל · המאה ה־16</p>
      <div className="dgp-env">
        <div className="env-back" /><div className="env-sheet" /><div className="env-front" /><div className="env-flap" />
        <button type="button" className="dgp-seal" onClick={start} aria-label="שברו את החותם והתחילו">
          <span className="half a" /><span className="half b" />
        </button>
      </div>
      <p className="dgp-hint">לחצו על החותם</p>
    </div>}

    <button type="button" className="dgp-skip" onClick={close}>דילוג</button>
  </div>;
}
