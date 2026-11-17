import React, { useMemo, useState, useRef } from 'react';
import type { MiniGame, TF, Quiz, Spot, Timeline, Memory, Sort } from './content';
import { shuffle } from './store';
type P<T> = { g: T; onDone: (score: number) => void };
const MAX = 70;

function Progress({ i, n }: { i: number; n: number }) {
  return <div className="mg-progress" aria-hidden="true">{Array.from({ length: n }, (_, k) => <i key={k} className={k < i ? 'on' : k === i ? 'cur' : ''} />)}</div>;
}
function Done({ score, text }: { score: number; text: string }) {
  return <div className="mg-done" role="status"><div className="mg-done-pts">+{score}</div><div><b>המשימה הושלמה</b><p>{text}</p></div></div>;
}

function TrueFalse({ g, onDone }: P<TF>) {
  const [i, setI] = useState(0); const [ans, setAns] = useState<boolean | null>(null); const [right, setRight] = useState(0); const [fin, setFin] = useState(false);
  const it = g.items[i];
  const pick = (v: boolean) => { if (ans !== null) return; setAns(v); if (v === it.answer) setRight(r => r + 1); };
  const next = () => { if (i + 1 < g.items.length) { setI(i + 1); setAns(null); } else { setFin(true); onDone(Math.round(MAX * right / g.items.length)); } };
  if (fin) return <Done score={Math.round(MAX * right / g.items.length)} text={`${right} מתוך ${g.items.length} תשובות נכונות.`} />;
  const ok = ans !== null && ans === it.answer;
  return <div className="mg tf">
    <Progress i={i} n={g.items.length} />
    <div className={'tf-card ' + (ans === null ? '' : ok ? 'good' : 'bad')} key={i}><span className="mg-count">משפט {i + 1} מתוך {g.items.length}</span><p>{it.text}</p></div>
    <div className="tf-btns">
      <button type="button" className={'tf-btn yes ' + (ans === true ? 'picked' : '')} onClick={() => pick(true)} disabled={ans !== null}>✓ נכון</button>
      <button type="button" className={'tf-btn no ' + (ans === false ? 'picked' : '')} onClick={() => pick(false)} disabled={ans !== null}>✕ לא נכון</button>
    </div>
    {ans !== null && <div className={'mg-feedback ' + (ok ? 'good' : 'bad')} role="status"><b>{ok ? 'מצוין!' : 'לא בדיוק.'}</b> {it.why}<button type="button" className="mg-next" onClick={next}>{i + 1 < g.items.length ? 'למשפט הבא' : 'סיום'} ←</button></div>}
  </div>;
}

function QuizGame({ g, onDone }: P<Quiz>) {
  const [i, setI] = useState(0); const [ans, setAns] = useState<number | null>(null); const [right, setRight] = useState(0); const [fin, setFin] = useState(false);
  const it = g.items[i];
  const pick = (k: number) => { if (ans !== null) return; setAns(k); if (k === it.answer) setRight(r => r + 1); };
  const next = () => { if (i + 1 < g.items.length) { setI(i + 1); setAns(null); } else { setFin(true); onDone(Math.round(MAX * right / g.items.length)); } };
  if (fin) return <Done score={Math.round(MAX * right / g.items.length)} text={`${right} מתוך ${g.items.length} תשובות נכונות.`} />;
  return <div className="mg quiz">
    <Progress i={i} n={g.items.length} />
    <div className="quiz-q" key={i}><span className="mg-count">שאלה {i + 1} מתוך {g.items.length}</span><h4>{it.q}</h4></div>
    <div className="quiz-opts">{it.options.map((o, k) => {
      const cls = ans === null ? '' : k === it.answer ? 'good' : k === ans ? 'bad' : 'dim';
      return <button type="button" key={k} className={'quiz-opt ' + cls} onClick={() => pick(k)} disabled={ans !== null}><b>{'אבג'[k]}</b>{o}</button>;
    })}</div>
    {ans !== null && <div className={'mg-feedback ' + (ans === it.answer ? 'good' : 'bad')} role="status"><b>{ans === it.answer ? 'נכון!' : 'לא הפעם.'}</b> {it.why}<button type="button" className="mg-next" onClick={next}>{i + 1 < g.items.length ? 'לשאלה הבאה' : 'סיום'} ←</button></div>}
  </div>;
}

function SpotGame({ g, onDone }: P<Spot>) {
  const [found, setFound] = useState<number[]>([]); const [wrong, setWrong] = useState<number[]>([]); const [last, setLast] = useState<number | null>(null); const [fin, setFin] = useState(false);
  const fakes = g.sentences.filter(s => s.fake).length;
  const score = Math.max(20, MAX - 10 * wrong.length);
  const tap = (k: number) => {
    if (fin || found.includes(k) || wrong.includes(k)) return;
    setLast(k);
    if (g.sentences[k].fake) { const f = [...found, k]; setFound(f); if (f.length === fakes) { setFin(true); onDone(score); } }
    else setWrong([...wrong, k]);
  };
  return <div className="mg spot">
    <div className="spot-doc" aria-label="פסקה שכתב כלי בינה מלאכותית">
      <div className="spot-doc-head"><span className="ai-chip">✦ טקסט שנוצר ב־AI</span><span>נמצאו {found.length} מתוך {fakes}</span></div>
      <p>{g.sentences.map((s, k) => <React.Fragment key={k}><button type="button" className={'spot-s ' + (found.includes(k) ? 'fake' : wrong.includes(k) ? 'real' : '')} onClick={() => tap(k)} aria-pressed={found.includes(k) || wrong.includes(k)}>{s.text}</button>{' '}</React.Fragment>)}</p>
    </div>
    {last !== null && !fin && <div className={'mg-feedback ' + (g.sentences[last].fake ? 'good' : 'bad')} role="status"><b>{g.sentences[last].fake ? 'תפסת!' : 'המשפט הזה בסדר.'}</b> {g.sentences[last].why}</div>}
    {fin && <><div className="mg-feedback good" role="status"><b>כל הכבוד, בלשית!</b> {g.sentences[last!].why} לפני שמשלבות ציטוט, בודקות שיש לו מקור.</div><Done score={score} text={wrong.length ? `${wrong.length} לחיצות על משפטים שכן מופיעים במקור.` : 'בלי אף טעות.'} /></>}
  </div>;
}

function TimelineGame({ g, onDone }: P<Timeline>) {
  const [order, setOrder] = useState<number[]>(() => { let s = shuffle(g.events.map((_, i) => i), 11); if (s.every((v, i) => v === i)) s = s.reverse(); return s; });
  const [checks, setChecks] = useState(0); const [checked, setChecked] = useState(false); const [fin, setFin] = useState(false);
  const drag = useRef<number | null>(null); const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => { if (fin || to < 0 || to >= order.length) return; const o = order.slice(); const [x] = o.splice(from, 1); o.splice(to, 0, x); setOrder(o); setChecked(false); };
  const allOk = order.every((v, i) => v === i);
  const score = Math.max(25, MAX - 15 * Math.max(0, checks - 1));
  const check = () => { const c = checks + 1; setChecks(c); setChecked(true); if (allOk) { setFin(true); onDone(Math.max(25, MAX - 15 * (c - 1))); } };
  const reveal = () => { setOrder(g.events.map((_, i) => i)); setChecked(true); setChecks(5); setFin(true); onDone(25); };
  return <div className="mg timeline">
    <ol className="tl-list">{order.map((ev, pos) => {
      const st = checked ? (ev === pos ? 'good' : 'bad') : '';
      return <li key={ev} className={'tl-item ' + st + (over === pos ? ' over' : '')} draggable={!fin}
        onDragStart={() => { drag.current = pos; }} onDragOver={e => { e.preventDefault(); setOver(pos); }} onDragLeave={() => setOver(null)}
        onDrop={e => { e.preventDefault(); if (drag.current !== null) move(drag.current, pos); drag.current = null; setOver(null); }}>
        <span className="tl-dot">{pos + 1}</span>
        <span className="tl-text">{g.events[ev].text}{(fin || (checked && ev === pos)) && <em>{g.events[ev].tag}</em>}</span>
        {!fin && <span className="tl-arrows"><button type="button" aria-label="הזיזו למעלה (מוקדם יותר)" onClick={() => move(pos, pos - 1)} disabled={pos === 0}>▲</button><button type="button" aria-label="הזיזו למטה (מאוחר יותר)" onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1}>▼</button></span>}
      </li>;
    })}</ol>
    {!fin && <div className="mg-actions"><button type="button" className="mg-primary" onClick={check}>בדיקה</button>{checks >= 3 && <button type="button" className="mg-ghost" onClick={reveal}>הראו לי את הסדר</button>}</div>}
    {checked && !fin && <div className="mg-feedback bad" role="status"><b>כמעט.</b> {order.filter((v, i) => v === i).length} מתוך {order.length} במקום הנכון (מסומנים בירוק). נסו להזיז את האחרים.</div>}
    {fin && <Done score={score} text={checks <= 1 ? 'סדר מושלם בניסיון הראשון.' : `הסדר הושלם אחרי ${Math.min(checks, 5)} בדיקות.`} />}
  </div>;
}

function MemoryGame({ g, onDone }: P<Memory>) {
  const cards = useMemo(() => shuffle(g.pairs.flatMap((p, i) => [{ id: i * 2, pair: i, text: p.term, term: true }, { id: i * 2 + 1, pair: i, text: p.def, term: false }]), 5), [g]);
  const [open, setOpen] = useState<number[]>([]); const [matched, setMatched] = useState<number[]>([]); const [moves, setMoves] = useState(0); const [fin, setFin] = useState(false);
  const lock = useRef(false);
  const flip = (k: number) => {
    if (lock.current || open.includes(k) || matched.includes(cards[k].pair) || fin) return;
    const o = [...open, k]; setOpen(o);
    if (o.length === 2) {
      const m = moves + 1; setMoves(m); lock.current = true;
      if (cards[o[0]].pair === cards[o[1]].pair) {
        const mm = [...matched, cards[k].pair];
        setTimeout(() => { setMatched(mm); setOpen([]); lock.current = false; if (mm.length === g.pairs.length) { setFin(true); onDone(Math.max(30, MAX - 4 * Math.max(0, m - g.pairs.length))); } }, 450);
      } else setTimeout(() => { setOpen([]); lock.current = false; }, 1100);
    }
  };
  const score = Math.max(30, MAX - 4 * Math.max(0, moves - g.pairs.length));
  return <div className="mg memory">
    <div className="mem-stats"><span>זוגות: <b>{matched.length}/{g.pairs.length}</b></span><span>ניסיונות: <b>{moves}</b></span></div>
    <div className="mem-grid">{cards.map((c, k) => {
      const up = open.includes(k) || matched.includes(c.pair);
      return <button type="button" key={c.id} className={'mem-card ' + (up ? 'up ' : '') + (matched.includes(c.pair) ? 'matched ' : '') + (c.term ? 'term' : 'def')} onClick={() => flip(k)} aria-label={up ? c.text : 'קלף הפוך'} aria-pressed={up}>
        <span className="mem-inner"><span className="mem-back">✦</span><span className="mem-front">{c.text}</span></span>
      </button>;
    })}</div>
    {fin && <Done score={score} text={`כל הזוגות נמצאו ב־${moves} ניסיונות.`} />}
  </div>;
}

function SortGame({ g, onDone }: P<Sort>) {
  const items = useMemo(() => shuffle(g.items.map((_, i) => i), 3), [g]);
  const [placed, setPlaced] = useState<Record<number, number>>({}); const [sel, setSel] = useState<number | null>(null); const [miss, setMiss] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [fin, setFin] = useState(false); const [shake, setShake] = useState<number | null>(null);
  const firstTry = g.items.length - miss.length;
  const drop = (bin: number, it = sel) => {
    if (it === null || fin) return;
    if (g.items[it].bin === bin) {
      const p = { ...placed, [it]: bin }; setPlaced(p); setSel(null); setMsg({ ok: true, t: g.items[it].why });
      if (Object.keys(p).length === g.items.length) { setFin(true); onDone(Math.round(MAX * (g.items.length - miss.length) / g.items.length)); }
    } else { if (!miss.includes(it)) setMiss([...miss, it]); setShake(bin); setTimeout(() => setShake(null), 500); setMsg({ ok: false, t: `לא "${g.bins[bin]}". חשבו: האם זה משהו שרצתה, משהו שעשתה, או משהו שקרה בסוף?` }); }
  };
  const left = items.filter(i => placed[i] === undefined);
  return <div className="mg sort">
    {!fin && <p className="sort-hint">{sel === null ? 'בחרו כרטיס, ואז לחצו על העמודה המתאימה. במחשב אפשר גם לגרור.' : 'עכשיו לחצו על העמודה המתאימה.'}</p>}
    {left.length > 0 && <div className="sort-pool">{left.map(i => <button type="button" key={i} draggable className={'sort-card ' + (sel === i ? 'sel' : '')} onClick={() => setSel(sel === i ? null : i)} onDragStart={e => { setSel(i); e.dataTransfer.setData('text/plain', String(i)); }} aria-pressed={sel === i}>{g.items[i].text}</button>)}</div>}
    <div className="sort-bins">{g.bins.map((b, k) => <div key={k} className={'sort-bin b' + k + (shake === k ? ' shake' : '') + (sel !== null ? ' ready' : '')} onClick={() => drop(k)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); drop(k, Number(e.dataTransfer.getData('text/plain'))); }} role="button" tabIndex={0} aria-label={'עמודת ' + b} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(k); } }}>
      <h5>{b}</h5>{items.filter(i => placed[i] === k).map(i => <div key={i} className="sort-placed">{g.items[i].text}</div>)}
    </div>)}</div>
    {msg && !fin && <div className={'mg-feedback ' + (msg.ok ? 'good' : 'bad')} role="status">{msg.t}</div>}
    {fin && <Done score={Math.round(MAX * firstTry / g.items.length)} text={`${firstTry} מתוך ${g.items.length} מוינו נכון כבר בניסיון הראשון.`} />}
  </div>;
}

export function MiniGameView({ g, onDone }: { g: MiniGame; onDone: (s: number) => void }) {
  switch (g.kind) {
    case 'truefalse': return <TrueFalse g={g} onDone={onDone} />;
    case 'quiz': return <QuizGame g={g} onDone={onDone} />;
    case 'spot': return <SpotGame g={g} onDone={onDone} />;
    case 'timeline': return <TimelineGame g={g} onDone={onDone} />;
    case 'memory': return <MemoryGame g={g} onDone={onDone} />;
    case 'sort': return <SortGame g={g} onDone={onDone} />;
  }
}
