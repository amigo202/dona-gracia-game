import React from 'react';
import mapBase from '../map-base.svg';
import screens from '../screens.json';
import { SLUGS } from './store';
// נקודות אמת (קואורדינטות המפה 800×450) ומיקומי התוויות, מתוך הגרסה המאושרת
export const truePts: [number, number][] = [[69.44, 281.73], [263.07, 65.42], [375.94, 165.45], [365.97, 175.86], [613.98, 242.17], [707.59, 384.3]];
export const labelPts: [number, number][] = [[69, 282], [263, 65], [411, 131], [350, 205], [614, 242], [708, 384]];
export function seg(a: [number, number], b: [number, number], bend = 0.18) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  return `M${a[0]},${a[1]} Q${mx - dy * bend},${my + dx * bend} ${b[0]},${b[1]}`;
}
export type PinState = 'done' | 'open' | 'locked';
export function JourneyMap({ states, current, onPin, compact, animateTo, preview }: { states: PinState[]; current?: number; onPin?: (i: number) => void; compact?: boolean; animateTo?: number; preview?: boolean }) {
  const doneN = states.filter(s => s === 'done').length;
  return <div className={'jmap' + (compact ? ' compact' : '')}>
    <img className="jmap-img" src={mapBase} alt="מפת התמצאות סכמטית של אירופה ומזרח הים התיכון, עם שש תחנות המסע" />
    <svg className="jmap-svg" viewBox="0 0 800 450" preserveAspectRatio="none" aria-hidden="true">
      <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter></defs>
      {truePts.slice(0, -1).map((p, i) => {
        const d = seg(p, truePts[i + 1], i === 2 ? 0 : 0.18);
        const vision = i === 4; const walked = i < doneN; const active = i === doneN - 1 && animateTo === i + 1;
        return <g key={i}>
          <path d={d} className="route-base" />
          {vision ? <path d={d} className={'route-vision' + (states[5] !== 'locked' ? ' lit' : '')} pathLength={100} />
            : preview ? <path d={d} className="route-walk draw" style={{ animationDelay: `${0.4 + i * 0.45}s`, animationDuration: '.6s' }} pathLength={100} /> : walked && <path d={d} className={'route-walk' + (active ? ' draw' : '')} pathLength={100} />}
        </g>;
      })}
      {truePts.map((p, i) => <g key={i}>
        <line x1={labelPts[i][0]} y1={labelPts[i][1]} x2={p[0]} y2={p[1]} stroke="#535d6c" strokeWidth="1" />
        <circle cx={p[0]} cy={p[1]} r="2.7" fill="#101a29" />
      </g>)}
      {current !== undefined && current >= 0 && <circle className="traveler-glow" cx={truePts[current][0]} cy={truePts[current][1]} r="9" filter="url(#glow)" />}
    </svg>
    {labelPts.map((p, i) => {
      const st = states[i];
      const s = screens[i + 1];
      return <button type="button" key={i} className={`map-pin ${st}` + (current === i ? ' chosen' : '') + (i === 5 ? ' vision' : '')} style={{ left: `${p[0] / 8}%`, top: `${p[1] / 4.5}%`, animationDelay: `${0.15 + i * 0.09}s` }}
        onClick={() => onPin?.(i)} aria-label={`תחנה ${i + 1}: ${s.city}` + (st === 'locked' ? ' (נעולה)' : st === 'done' ? ' (הושלמה)' : ' (פתוחה)')}>
        <b>{st === 'done' ? '✓' : st === 'locked' ? <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V7a3 3 0 0 0-6 0v3Z" /></svg> : i + 1}</b>
        <span>{s.city}</span>
      </button>;
    })}
  </div>;
}
export { SLUGS };
