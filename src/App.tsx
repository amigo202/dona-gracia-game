import React, { useEffect, useState } from 'react';
import screens from './screens.json';
import lisbon from './photos/lisbon.jpg';
import antwerp from './photos/antwerp.jpg';
import venice from './photos/venice.jpg';
import ferrara from './photos/ferrara.jpg';
import istanbul from './photos/istanbul.jpg';
import tiberias from './photos/tiberias.jpg';
import { missions, DILEMMA_PTS } from './game/content';
import { research } from './game/research';
import { extra, SRC, Fact } from './game/extra';
import { MiniGameView } from './game/MiniGames';
import { JourneyMap, PinState } from './game/JourneyMap';
import { StudioPanel, StudioPage, ResearchCards, Narrator, StudentVideo, Credits } from './game/Studio';
import { loadBaked, loadRecIndex } from './game/studio';
import { useGame, setGame, resetGame, SLUGS, isUnlocked, totalScore, doneCount, nextIndex, stars, useHashRoute, useSpeech } from './game/store';

const photos = [lisbon, lisbon, antwerp, venice, ferrara, istanbul, tiberias];
const SOURCE = 'https://tarbutil.cet.ac.il/lexicon/%D7%93%D7%95%D7%A0%D7%94-%D7%92%D7%A8%D7%A6%D7%99%D7%94/';
const imageSources = ['https://commons.wikimedia.org/wiki/File:Torre_de_Bel%C3%A9m_lighthouse.jpg', 'https://commons.wikimedia.org/wiki/File:Torre_de_Bel%C3%A9m_lighthouse.jpg', 'https://commons.wikimedia.org/wiki/File:City_of_Antwerp%2C_1572.jpg', "https://commons.wikimedia.org/wiki/File:Canaletto_-_The_Grand_Canal_in_Venice_with_the_Palazzo_Corner_Ca%27Grande_-_Google_Art_Project.jpg", 'https://commons.wikimedia.org/wiki/File:Castello_Estense_19Jh.jpg', "https://commons.wikimedia.org/wiki/File:1572_bird%27s_eye_view_map_of_Constantinople_-_Byzantium_Nunc_Constantinopolis.jpg", 'https://www.clevelandart.org/art/1927.91'];
const MAX_TOTAL = 600;
const vid = (n: string) => `./videos/${n}.mp4`; const poster = (n: string) => `./videos/${n}.jpg`;
const AI_LABEL = 'הדמיית AI — לא תיעוד היסטורי';
function StationVideo({ name, posterName, alt }: { name: string; posterName: string; alt: string }) {
  return <figure className="st-video">
    <video src={vid(name)} poster={poster(posterName)} autoPlay muted loop playsInline controls preload="metadata" aria-label={alt} />
    <figcaption><span className="ai-tag">{AI_LABEL}</span><span className="vid-alt">{alt.replace(/^הדמיה: /, '')}</span></figcaption>
  </figure>;
}
const Cite = ({ f }: { f: Fact }) => <span className="cite">{f.src.map((k, i) => <React.Fragment key={k}>{i > 0 && ' · '}<a href={SRC[k].url} target="_blank" rel="noopener noreferrer">{SRC[k].name}</a></React.Fragment>)}</span>;
function MoreInfo({ slug }: { slug: string }) {
  const x = extra[slug]; if (!x) return null;
  return <section className="more-info" aria-label="עוד מהמקורות">
    <h3><span>✦</span> עוד מהמקורות</h3>
    <ul>{x.facts.map((f, i) => <li key={i}><p>{f.text}</p><Cite f={f} /></li>)}</ul>
    <div className="dyk"><b>הידעת?</b><p>{x.didYouKnow.text}</p><Cite f={x.didYouKnow} /></div>
  </section>;
}
const Html = ({ tag: Tag = 'span', html, ...props }: any) => <Tag {...props} dangerouslySetInnerHTML={{ __html: html }} />;
const strip = (h: string) => h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const Ext = ({ href, children, className }: React.PropsWithChildren<{ href: string; className?: string }>) => <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

function pinStates(g: ReturnType<typeof useGame>): PinState[] { return SLUGS.map((k, i) => g.stations[k]?.done ? 'done' : isUnlocked(g, i) ? 'open' : 'locked'); }

function Header({ go }: { go: (r: string) => void }) {
  const g = useGame(); const score = totalScore(g); const done = doneCount(g);
  return <header className="g-header">
    <a className="brand" href="#/" onClick={e => { e.preventDefault(); go(''); }}><i /><span>מסע בעקבות דונה גרציה</span></a>
    <div className="sub">זהות · מנהיגות · חזון</div>
    <div className="hud" aria-label="ההתקדמות שלך">
      <span className="hud-pill" title="נקודות"><b>{score}</b><small>נק׳</small></span>
      <span className="hud-pill badges" title="תגים"><b dir="ltr">{done}/6</b><small>תגים</small></span>
      <button type="button" className="edition studio-btn" onClick={() => go('studio')} aria-label="סטודיו הכיתה" title="סטודיו הכיתה"><span aria-hidden="true">🎙️</span><span className="sb-txt">סטודיו הכיתה</span></button>
    </div>
  </header>;
}
function Footer({ go }: { go: (r: string) => void }) {
  return <footer className="g-footer"><span>מקור התוכן: <Ext href={SOURCE}>הערך "דונה גרציה", תרבות.il (מטח)</Ext> · מפה: Natural Earth · תמונות: נחלת הכלל ושימוש פתוח</span><button type="button" className="linkish" onClick={() => go('sources')}>כל המקורות והקרדיטים</button><b>דונה גרציה · מהסיפור שלה, ליצירה שלכן</b></footer>;
}

function Opening({ go }: { go: (r: string) => void }) {
  const g = useGame(); const s = screens[0]; const [name, setName] = useState(g.name);
  const started = doneCount(g) > 0;
  const start = () => { setGame(x => ({ ...x, name: name.trim(), started: x.started || new Date().toISOString() })); go('map'); };
  return <div className="view opening-view">
    <section className="op-map" aria-label="מפת המסע">
      <Html tag="div" className="map-title-wrap" html={s.title} />
      <JourneyMap states={SLUGS.map(() => 'open')} preview />
      <div className="legend"><span />טבריה: תחנת חזון, לא מקום שבו חיה</div>
    </section>
    <aside className="intro card-dark" aria-label="פתיחת המסע">
      <div className="photo"><video src={vid('opening')} poster={poster('opening')} autoPlay muted loop playsInline preload="metadata" aria-label="הדמיה: דמות בגלימה על סיפון ספינה מהמאה ה־16, מביטה אל הים" /><div className="photo-caption"><span className="ai-tag">{AI_LABEL}</span></div></div>
      <div className="intro-body">
        <span className="eyebrow"><i />{s.eyebrow}</span>
        <Html tag="h1" html={s.h1} />
        <Html tag="p" className="lead" html={s.lead} />
        <ul className="how">
          <li><b>6</b><span>תחנות שנפתחות<br />אחת אחרי השנייה</span></li>
          <li><b>?!</b><span>דילמה ומשימה<br />בכל תחנה</span></li>
          <li><b>✦</b><span>תגים, נקודות<br />ותעודת מסע</span></li>
        </ul>
        <label className="name-field"><span>איך קוראים לך? (יופיע בתעודה)</span><input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך" maxLength={40} onKeyDown={e => { if (e.key === 'Enter') start(); }} /></label>
        <button type="button" className="cta" onClick={start}><span>{started ? `ממשיכות במסע · ${doneCount(g)}/6` : 'יוצאות למסע'}</span><b>←</b></button>
        {started && <button type="button" className="linkish reset" onClick={() => { if (confirm('להתחיל את המסע מחדש? הנקודות והתגים יימחקו מהמכשיר.')) { resetGame(); setName(''); } }}>להתחיל מחדש</button>}
        <Html tag="div" className="stamp-wrap" html={s.stamp} />
      </div>
    </aside>
  </div>;
}

function MapView({ go, flash }: { go: (r: string) => void; flash: (t: string) => void }) {
  const g = useGame(); const st = pinStates(g); const ni = nextIndex(g); const done = doneCount(g);
  const [anim] = useState(() => Number(sessionStorage.getItem('dg-anim') || 0)); useEffect(() => { sessionStorage.removeItem('dg-anim'); }, []);
  const open = (i: number) => { if (st[i] === 'locked') { flash(`התחנה "${screens[i + 1].city}" תיפתח אחרי שתשלימו את "${screens[i].city}".`); return; } go(SLUGS[i]); };
  return <div className="view map-view">
    <section className="mv-map" aria-label="מפת המסע">
      <div className="map-title-wrap"><div className="map-title"><strong>{done === 6 ? 'המסע הושלם!' : done === 0 ? 'התחנה הראשונה מחכה' : `${done} תחנות מאחוריך`}</strong><div>{done === 6 ? 'התעודה שלך מוכנה' : `הבאה בתור: ${screens[ni + 1].city}`}</div></div></div>
      <JourneyMap states={st} current={ni >= 0 ? ni : 5} onPin={open} animateTo={anim} />
      <div className="legend"><span />טבריה: תחנת חזון, לא מקום שבו חיה</div>
    </section>
    <aside className="mv-panel card-dark" aria-label="המסע שלך">
      <div className="mv-head"><span className="eyebrow"><i />המסע שלך{g.name ? ` · ${g.name}` : ''}</span>
        <div className="ring" style={{ ['--p' as any]: `${(done / 6) * 100}%` }} aria-label={`${done} מתוך 6 תחנות`}><b>{done}</b><small>מתוך 6</small></div></div>
      <h2>{done === 6 ? 'הגעת לחזון.' : <>תחנה {ni + 1}<span className="dot">.</span> {screens[ni + 1].city}</>}</h2>
      <p className="mv-lead">{done === 6 ? 'השלמת את כל שש התחנות. אפשר לחזור לכל תחנה כדי לשפר את הניקוד, או לקבל את התעודה.' : strip(screens[ni + 1].heading || '') + '. ' + (missions[SLUGS[ni]].gameLabel) + ' ודילמה אחת מחכות לך.'}</p>
      {done === 6 ? <button type="button" className="cta" onClick={() => go('certificate')}><span>לתעודת המסע</span><b>←</b></button>
        : <button type="button" className="cta" onClick={() => go(SLUGS[ni])}><span>{done === 0 ? 'פותחות את התחנה הראשונה' : 'לתחנה הבאה'}</span><b>←</b></button>}
      <ol className="mv-list">{SLUGS.map((k, i) => {
        const p = g.stations[k]; const m = missions[k];
        return <li key={k} className={st[i]}><button type="button" onClick={() => open(i)} aria-label={`${screens[i + 1].city}: ${st[i] === 'done' ? 'הושלמה' : st[i] === 'open' ? 'פתוחה' : 'נעולה'}`}>
          <span className="mv-num">{st[i] === 'done' ? m.badge.icon : i + 1}</span>
          <span className="mv-txt"><b>{screens[i + 1].city}</b><small>{st[i] === 'locked' ? 'נעולה' : m.gameLabel}</small></span>
          <span className="mv-score">{p?.done ? <><span className="stars" aria-label={`${stars(p.score)} כוכבים`}>{'★'.repeat(stars(p.score))}<i>{'★'.repeat(3 - stars(p.score))}</i></span>{p.score}</> : st[i] === 'locked' ? '🔒' : 'חדש'}</span>
        </button></li>;
      })}</ol>
    </aside>
  </div>;
}

type Step = 0 | 1 | 2 | 3;
function StationView({ idx, go, flash }: { idx: number; go: (r: string) => void; flash: (t: string) => void }) {
  const g = useGame(); const slug = SLUGS[idx]; const s = screens[idx + 1] as any; const m = missions[slug]; const prev = g.stations[slug];
  const [step, setStep] = useState<Step>(0); const [choice, setChoice] = useState<number | null>(null); const [gameScore, setGameScore] = useState<number | null>(null); const [round, setRound] = useState(0);
  const dPts = choice === null ? 0 : m.dilemma.choices[choice].historical ? DILEMMA_PTS.historical : DILEMMA_PTS.other;
  const firstRender = React.useRef(true);
  useEffect(() => { if (firstRender.current) { firstRender.current = false; return; } const el = document.querySelector('.st-steps'); if (el && el.getBoundingClientRect().top < 70) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [step, round]);
  const finish = () => {
    const score = dPts + (gameScore || 0); const first = !prev?.done;
    setGame(x => { const old = x.stations[slug]; const best = old && old.score > score ? old : { done: true, score, dilemma: dPts, game: gameScore || 0, choice: choice ?? -1 }; return { ...x, stations: { ...x.stations, [slug]: { ...best, done: true } }, finished: idx === 5 && !x.finished ? new Date().toISOString() : x.finished }; });
    if (first) sessionStorage.setItem('dg-anim', String(idx + 1));
    setStep(3);
  };
  const story = `${s.city}. ${strip(s.heading)}. ${strip(s.story)} מושג לדרך: ${strip(s.concept)}. ${strip(s.definition)}`;
  const r = research[slug];
  const stepNames = ['הסיפור', 'הדילמה', m.gameLabel, 'התג'];
  const historical = m.dilemma.choices.findIndex(c => c.historical);
  return <div className="view station-view">
    <section className="st-hero">
      <img src={photos[idx + 1]} alt={s.caption} />
      <div className="st-hero-in">
        <button type="button" className="back" onClick={() => go('map')} aria-label="בחזרה למפה">→ למפה</button>
        <div className="station-line"><span className="eyebrow"><i />{s.eyebrow}</span><span className="date">{s.date}</span></div>
        <Html tag="h1" html={s.h1} />
        <div className="photo-caption"><Ext href={imageSources[idx + 1]}>{s.caption}</Ext></div>
      </div>
    </section>
    <div className="st-body">
      <main className="st-main">
        <nav className="st-steps" aria-label="שלבי התחנה">{stepNames.map((n, k) => <span key={k} className={k === step ? 'on' : k < step ? 'past' : ''} aria-current={k === step ? 'step' : undefined}><b>{k < step ? '✓' : k + 1}</b>{n}</span>)}</nav>
        <div className="st-stage" key={step + '-' + round}>
          {step === 0 && <>
            {extra[slug] && <StationVideo name={extra[slug].video} posterName={extra[slug].poster} alt={extra[slug].videoAlt} />}
            <Html tag="h2" html={s.heading} />
            <Html tag="p" className="story" html={s.story} />
            <Narrator slug={slug} text={story} />
            <StudentVideo slug={slug} />
            <MoreInfo slug={slug} />
            <div className="concept"><b>מושג לדרך</b><Html tag="strong" html={s.concept} /><Html tag="p" html={s.definition} /></div>
            {idx === 5 && <div className="vision-note"><b>תחנת חזון.</b> דונה גרציה פעלה למען טבריה, אך לא חיה בה ולא הגיעה אליה.</div>}
            <div className="actions"><button type="button" className="cta" onClick={() => setStep(1)}><span>לדילמה</span><b>←</b></button></div>
            <StudioPanel slug={slug} city={s.city} flash={flash} go={go} />
          </>}
          {step === 1 && <div className="dilemma">
            <p className="dl-setup">{m.dilemma.setup}</p>
            <h3 className="dl-q">{m.dilemma.question}</h3>
            <div className="dl-choices" role="group" aria-label="אפשרויות">{m.dilemma.choices.map((c, k) => {
              const cls = choice === null ? '' : k === choice ? 'picked' + (c.historical ? ' hist' : '') : c.historical ? 'hist' : 'dim';
              return <button type="button" key={k} className={'dl-choice ' + cls} disabled={choice !== null} onClick={() => setChoice(k)}><b>{'אבג'[k]}</b><span>{c.text}</span>{choice !== null && c.historical && <em>מה שקרה לפי המקור</em>}</button>;
            })}</div>
            {choice !== null && <div className="dl-feedback" role="status">
              <div className="pts-burst">+{dPts}</div>
              <p><b>{m.dilemma.choices[choice].historical ? 'בחרת כמוה.' : 'בחירה שלך, ויש לה היגיון.'}</b> {m.dilemma.choices[choice].feedback}</p>
              {!m.dilemma.choices[choice].historical && <p className="dl-hist"><b>ומה היא עשתה?</b> {m.dilemma.choices[historical].feedback}</p>}
              <p className="dl-reveal">✦ {m.dilemma.reveal}</p>
              <div className="actions"><button type="button" className="cta" onClick={() => setStep(2)}><span>למשימה: {m.gameLabel}</span><b>←</b></button></div>
            </div>}
          </div>}
          {step === 2 && <div className="mission">
            <div className="task-title"><span>✦</span> משימה · {m.gameLabel}</div>
            <h3>{m.game.title}</h3><p className="mission-intro">{m.game.intro}</p>
            <MiniGameView g={m.game} onDone={sc => setGameScore(sc)} />
            {gameScore !== null && <div className="actions"><button type="button" className="cta" onClick={finish}><span>סיום התחנה</span><b>←</b></button></div>}
          </div>}
          {step === 3 && <div className="reward">
            <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, k) => { const a = (k * 137.5) % 360, d = 90 + ((k * 53) % 140); return <i key={k} style={{ ['--x' as any]: `${Math.cos(a * Math.PI / 180) * d}px`, ['--y' as any]: `${Math.sin(a * Math.PI / 180) * d * 0.8 + 60}px`, ['--r' as any]: `${(k * 97) % 720 - 360}deg`, animationDelay: `${(k % 7) * 30}ms` }} />; })}</div>
            <div className="badge-big" aria-hidden="true"><span>{m.badge.icon}</span></div>
            <p className="eyebrow-dark">תג חדש נפתח</p>
            <h2>{m.badge.name}</h2><p className="reward-line">{m.badge.line}</p>
            <div className="reward-score"><div><small>דילמה</small><b>{dPts}</b></div><div><small>משימה</small><b>{gameScore}</b></div><div className="tot"><small>התחנה</small><b>{dPts + (gameScore || 0)}<i>/100</i></b></div></div>
            <div className="stars big" aria-label={`${stars(dPts + (gameScore || 0))} כוכבים`}>{'★'.repeat(stars(dPts + (gameScore || 0)))}<i>{'★'.repeat(3 - stars(dPts + (gameScore || 0)))}</i></div>
            {prev?.done && prev.score > dPts + (gameScore || 0) && <p className="reward-note">נשמר הניקוד הטוב יותר שלך מהפעם הקודמת: {prev.score}.</p>}
            <div className="task research-task"><div className="task-title"><span>✦</span> עוצרות לחקר</div><Html tag="h3" html={s.tasktitle} /><Html tag="p" html={s.tasktext} /><Ext href={SOURCE} className="task-link">לפתיחת המקור ↗</Ext></div>
            <div className="actions two">
              {idx < 5 ? <button type="button" className="cta" onClick={() => go('map')}><span>ממשיכות ל{screens[idx + 2].city}</span><b>←</b></button>
                : <button type="button" className="cta" onClick={() => go('certificate')}><span>לתעודת המסע</span><b>←</b></button>}
              <button type="button" className="ghost" onClick={() => { setStep(0); setChoice(null); setGameScore(null); setRound(x => x + 1); }}>לשחק שוב בתחנה</button>
            </div>
          </div>}
        </div>
      </main>
      <aside className="st-side">
        <div className="side-card">
          <JourneyMap compact states={pinStates(g)} current={idx} onPin={i => { if (pinStates(g)[i] === 'locked') flash('התחנה הזו עוד נעולה.'); else go(SLUGS[i]); }} />
        </div>
        <div className="byline-card our-research" aria-label="החוקרות שלנו">
          <h3 className="rc-title"><span>✦</span> החוקרות שלנו</h3>
          {r && <div className="research"><b>{r.student}</b><p>{r.text}</p>{r.source && <small>מקור: {r.source}</small>}</div>}
          <ResearchCards slug={slug} />
        </div>
        <p className="side-src">מקור מידע: מטח, "דונה גרציה" · <Ext href={SOURCE}>לפתיחת המקור ↗</Ext></p>
      </aside>
    </div>
  </div>;
}

function Certificate({ go }: { go: (r: string) => void }) {
  const g = useGame(); const done = doneCount(g); const score = totalScore(g); const [name, setName] = useState(g.name);
  if (done < 6) return <div className="view cert-view"><div className="cert-locked card-dark"><h2>התעודה עוד בדרך</h2><p>השלימו את כל שש התחנות כדי לקבל את תעודת המסע. השלמתן {done} מתוך 6.</p><button type="button" className="cta" onClick={() => go('map')}><span>למפה</span><b>←</b></button></div></div>;
  const date = new Date(g.finished || Date.now()).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  const perfect = score >= 540;
  return <div className="view cert-view">
    <div className="cert-tools no-print">
      <label className="name-field light"><span>השם בתעודה</span><input value={name} onChange={e => { setName(e.target.value); setGame(x => ({ ...x, name: e.target.value })); }} placeholder="השם שלך" maxLength={40} /></label>
      <button type="button" className="cta" onClick={() => window.print()}><span>הדפסה או שמירה כ־PDF</span><b>⎙</b></button>
      <button type="button" className="ghost dark" onClick={() => go('map')}>חזרה למפה</button>
    </div>
    <article className="certificate" aria-label="תעודת מסע">
      <div className="cert-frame">
        <div className="cert-top"><span className="cert-brand"><i />מסע בעקבות דונה גרציה</span><span className="cert-date">{date}</span></div>
        <p className="cert-kicker">תעודת מסע</p>
        <h1 className="cert-name">{name.trim() || 'נוסעת אמיצה'}</h1>
        <p className="cert-text">השלימה את המסע בעקבות דונה גרציה,<br /> מליסבון ועד החזון בטבריה, דרך שש תחנות של זהות, מנהיגות וחזון.</p>
        <div className="cert-score"><b>{score}</b><span>נקודות מתוך {MAX_TOTAL}</span>{perfect && <em>מסע מצטיין</em>}</div>
        <ul className="cert-badges">{SLUGS.map(k => { const m = missions[k]; const p = g.stations[k]; return <li key={k}><span className="cb-ico">{m.badge.icon}</span><b>{m.badge.name}</b><small>{'★'.repeat(stars(p.score))}</small></li>; })}</ul>
        <Credits className="cert-credits" />
        <div className="cert-foot"><span>זהות · מנהיגות · חזון</span><span className="seal" aria-hidden="true">✦<br />6/6</span><span>מקור התוכן: תרבות.il (מטח)</span></div>
      </div>
    </article>
    <div className="no-print cert-again"><button type="button" className="linkish" onClick={() => { if (confirm('להתחיל את המסע מחדש? הנקודות והתגים יימחקו מהמכשיר.')) { resetGame(); go(''); } }}>להתחיל מסע חדש</button></div>
  </div>;
}

function Sources({ go }: { go: (r: string) => void }) {
  return <div className="view sources-view"><div className="sources card-light">
    <button type="button" className="back dark" onClick={() => go('map')}>→ חזרה</button>
    <h2>מקורות וקרדיטים</h2>
    <p>התוכן ההיסטורי, כולל הדילמות והמשימות, הוא עיבוד לצורכי למידה של הערך <Ext href={SOURCE}>"דונה גרציה" באתר תרבות.il של מטח</Ext>, מאת חן מרקס ומתיה קם. אין במשחק ציטוטים מפיה. הציטוט המומצא בתחנת ונציה מסומן במפורש כהמצאה לצורך התרגול.</p>
    <p>הדילמות מציגות אפשרויות לחשיבה. רק האפשרות שמסומנת "מה שקרה לפי המקור" מתארת את מה שעשתה.</p>
    <p>המפה מבוססת על <Ext href="https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson">Natural Earth</Ext> ומציגה קווי מתאר מודרניים להתמצאות. הקווים בין התחנות אינם שחזור של נתיב נסיעה; הקו לטבריה מציין חזון, לא ביקור.</p>
    <h3>מידע נוסף בתחנות</h3>
    <p>הקטעים "עוד מהמקורות" ו"הידעת?" נוספו ב־16.11.2026 מתוך המקורות האלה, וליד כל עובדה מצוין המקור שלה. כשהמקורות חלוקים, הדבר נאמר במפורש.</p>
    <ul>{Object.values(SRC).map(x => <li key={x.url}><Ext href={x.url}>{x.name}</Ext></li>)}</ul>
    <h3>התלמידות שיצרו</h3>
    <p>כרטיסי «החוקרות שלנו», ההקלטות והסרטונים בתחנות הם של תלמידות הכיתה. <button type="button" className="linkish" onClick={() => go('studio')}>לסטודיו הכיתה</button></p>
    <Credits title="שמות" className="light" />
    <h3>סרטונים</h3>
    <p>הסרטונים בראש כל תחנה ובמסך הפתיחה הם הדמיות שנוצרו בבינה מלאכותית (Grok Imagine) כדי להמחיש את אווירת התקופה. הם אינם תיעוד היסטורי, והדמות בגלימה אינה דיוקן של דונה גרציה.</p>
    <h3>תמונות</h3>
    <ul>{screens.slice(1).map((s, i) => <li key={s.slug}><Ext href={imageSources[i + 1]}>{s.caption}</Ext></li>)}</ul>
    <p className="small">התמונות הן דימויים היסטוריים של הערים, לא תיעוד של אירועים בחייה. הקריינות היא קול הדגמה ממוחשב של הדפדפן, עד שהתלמידות מקליטות את התחנה. ה"מכתב מדונה גרציה" בסטודיו הכיתה הוא כתיבה יצירתית ולא ציטוט.</p>
  </div></div>;
}

export function App() {
  const [route, go] = useHashRoute(); const g = useGame();
  const [toast, setToast] = useState(''); const flash = (t: string) => { setToast(t); window.clearTimeout((flash as any)._t); (flash as any)._t = window.setTimeout(() => setToast(''), 2800); };
  const idx = SLUGS.indexOf(route);
  useEffect(() => { loadBaked(); loadRecIndex(SLUGS); }, []);
  useEffect(() => { if (idx >= 0 && !isUnlocked(g, idx)) { go('map'); flash('התחנה הזו עוד נעולה. משלימות קודם את התחנות שלפניה.'); } }, [idx]); // eslint-disable-line
  useEffect(() => { window.scrollTo(0, 0); window.speechSynthesis?.cancel?.(); const t = route === '' ? 'מסע בעקבות דונה גרציה' : idx >= 0 ? `${screens[idx + 1].city} · מסע בעקבות דונה גרציה` : route === 'certificate' ? 'תעודת מסע · דונה גרציה' : route === 'studio' ? 'סטודיו הכיתה · דונה גרציה' : 'מפת המסע · דונה גרציה'; document.title = t; }, [route]);
  let view: React.ReactNode;
  if (idx >= 0 && isUnlocked(g, idx)) view = <StationView key={route} idx={idx} go={go} flash={flash} />;
  else if (route === 'map' || idx >= 0) view = <MapView go={go} flash={flash} />;
  else if (route === 'certificate') view = <Certificate go={go} />;
  else if (route === 'sources') view = <Sources go={go} />;
  else if (route === 'studio') view = <StudioPage go={go} flash={flash} cities={screens.slice(1).map(x => x.city)} />;
  else view = <Opening go={go} />;
  return <div className="game" dir="rtl" lang="he">
    <a className="skip" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>דילוג לתוכן</a>
    <Header go={go} />
    <div id="main-content" tabIndex={-1} className="g-main" key={route}>{view}</div>
    <Footer go={go} />
    <div className={'toast' + (toast ? ' show' : '')} role="status" aria-live="polite">{toast}</div>
  </div>;
}
