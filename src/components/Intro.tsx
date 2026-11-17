import React, { useEffect, useRef, useState } from 'react';
import mapBase from '../map-base.svg';
import screens from '../screens.json';
import { truePts, labelPts, seg } from '../game/JourneyMap';
import './intro.css';

/* פתיחה קצרה (כ־12 שניות) בשפה של הלומדה: המפה הבהירה, קו סגול, סיכות ממוספרות וכפתור ליים. בלי קול. */
const KEY = 'dg-intro-seen';
const CAPTIONS = ['נולדה בזהות נסתרת', 'מנהלת עולם של מסחר', 'עוזרת לאחרים לברוח', 'חוזרת לשמה, חנה נשיא', 'חיה כיהודייה בגלוי', 'חולמת על בית לעם'];
// step: ‎-1 = מפה ריקה, 0–5 = עיר, 6 = עמעום וטקסט, 7 = כפתור
const FINAL = 7;

export function shouldShowIntro(route: string) {
  if (typeof window === 'undefined') return false;
  if (/[?&]intro(=|&|$)/.test(location.search)) return true;
  if (route !== '') return false;
  try { return !sessionStorage.getItem(KEY); } catch { return false; }
}

export function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const [step, setStep] = useState(reduce ? FINAL : -1);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* פרטי */ }
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const ts: number[] = [];
    if (!reduce) [2000, 3000, 4000, 5000, 6000, 7000, 8000, 11000].forEach((ms, i) => ts.push(window.setTimeout(() => setStep(i), ms)));
    return () => { ts.forEach(clearTimeout); document.body.style.overflow = prev; };
  }, []); // eslint-disable-line
  const close = () => {
    if (leaving) return; setLeaving(true);
    window.setTimeout(onDone, reduce ? 0 : 380);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); });
  const city = Math.min(step, 5);
  const shown = reduce ? 6 : city + 1; // כמה סיכות מוצגות
  return <div className={'dgi' + (step >= 6 ? ' dim' : '') + (leaving ? ' out' : '') + (reduce ? ' still' : '')} dir="rtl" lang="he" role="dialog" aria-modal="true" aria-label="פתיחה: מסע בעקבות דונה גרציה">
    <button type="button" className="dgi-skip" onClick={close}>דילוג</button>
    <div className="dgi-stage">
      <div className="dgi-top"><div className="map-title"><strong>שנת 1510. ליסבון.</strong></div></div>
      <div className="dgi-map">
        <div className="jmap">
          <img className="jmap-img" src={mapBase} alt="" />
          <svg className="jmap-svg" viewBox="0 0 800 450" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <mask id="dgi-vmask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="450">
                {shown >= 5 && <path d={seg(truePts[4], truePts[5], 0.18)} className={'dgi-mask' + (reduce ? '' : ' draw')} pathLength={100} />}
              </mask>
            </defs>
            {truePts.slice(0, -1).map((p, i) => {
              const d = seg(p, truePts[i + 1], i === 2 ? 0 : 0.18);
              const on = shown >= i + 1; // הקטע מתחיל להימשך כשהעיר שממנה יוצאים מופיעה
              return <g key={i}>
                <path d={d} className="route-base dgi-base" style={{ opacity: on ? .7 : 0 }} />
                {i === 4 ? <path d={d} className="route-vision lit" mask="url(#dgi-vmask)" />
                  : on && <path d={d} className={'route-walk' + (reduce ? '' : ' dgi-draw')} pathLength={100} />}
              </g>;
            })}
            {truePts.map((p, i) => i < shown && <g key={i} className="dgi-dot">
              <line x1={labelPts[i][0]} y1={labelPts[i][1]} x2={p[0]} y2={p[1]} stroke="#535d6c" strokeWidth="1" />
              <circle cx={p[0]} cy={p[1]} r="2.7" fill="#101a29" />
            </g>)}
          </svg>
          {labelPts.map((p, i) => i < shown && <div key={i} className={'map-pin open dgi-pin' + (i === city && step < 6 ? ' dgi-now' : '')} style={{ left: `${p[0] / 8}%`, top: `${p[1] / 4.5}%`, animationDelay: '0s' }}>
            <b>{i + 1}</b><span>{screens[i + 1].city}</span>
          </div>)}
        </div>
      </div>
      <div className="dgi-cap" aria-live="polite">
        {step >= 0 && step <= 5 && <div key={step} className="dgi-line"><b>{step + 1}</b><span>{CAPTIONS[step]}</span></div>}
      </div>
    </div>
    <div className="dgi-veil" />
    {step >= 6 && <div className="dgi-card card-dark">
      <h1>אישה אחת.<br />מסע שחצה גבולות.</h1>
      <p className="dgi-sub">ועכשיו אתן ממשיכות אותו.</p>
      <div className={'dgi-go' + (step >= FINAL ? ' on' : '')}>
        <button type="button" className="cta" onClick={close} tabIndex={step >= FINAL ? 0 : -1} aria-hidden={step < FINAL}><span>יוצאות למסע</span><b>←</b></button>
      </div>
    </div>}
  </div>;
}
