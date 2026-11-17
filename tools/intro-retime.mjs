// מתזמן מחדש את הפתיחה מהקלטת קריינות אמיתית.
// שימוש: node tools/intro-retime.mjs <narration.mp3> [--noise=-35] [--min-silence=0.35] [--first=5.6] [--dry]
// 1. מזהה שקטים (ffmpeg silencedetect) => קטעי דיבור.
// 2. אם יש יותר קטעים ממשפטים (בגלל עצירות "..."), מאחד את הקטעים עם ההפסקות הקצרות ביותר עד שיש בדיוק משפט לכל cue.
// 3. כותב start/end לכל cue ב-src/components/intro-cues.json, מעתיק את הקובץ ל-public/intro/narration.mp3 ומדליק audio.narration.
//    מעברי השוטים, הכתוביות והמוזיקה נגזרים אוטומטית מהטבלה (Intro.tsx > timeline). אחר כך: npm run build ופריסה.
import { execFileSync, spawnSync } from 'child_process'; import fs from 'fs'; import path from 'path';
const args = process.argv.slice(2); const file = args.find(a => !a.startsWith('--'));
const opt = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : undefined; };
if (!file) { console.error('usage: node tools/intro-retime.mjs narration.mp3'); process.exit(1); }
const GAME = '/workspace/dona-gracia/game', CFGP = `${GAME}/src/components/intro-cues.json`;
const cfg = JSON.parse(fs.readFileSync(CFGP, 'utf8'));
const noise = opt('noise') || '-35', minSil = opt('min-silence') || '0.35', first = +(opt('first') || 5.6);
const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString();
const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', `silencedetect=noise=${noise}dB:d=${minSil}`, '-f', 'null', '-'], { encoding: 'utf8' });
const txt = (r.stderr || '') + (r.stdout || ''); const sil = []; let s0 = null;
for (const l of txt.split('\n')) { let m; if ((m = l.match(/silence_start: ([\d.]+)/))) s0 = +m[1]; if ((m = l.match(/silence_end: ([\d.]+)/)) && s0 !== null) { sil.push([s0, +m[1]]); s0 = null; } }
if (s0 !== null) sil.push([s0, dur]);
// קטעי דיבור = המשלים של השקטים
let speech = []; let cur = 0;
for (const [a, b] of sil) { if (a - cur > 0.15) speech.push([cur, a]); cur = b; }
if (dur - cur > 0.15) speech.push([cur, dur]);
const N = cfg.cues.length;
if (speech.length < N) { console.error(`found ${speech.length} speech segments but need ${N}. Try a lower --min-silence (e.g. 0.25) or a higher --noise (e.g. -30).`); console.error(JSON.stringify(speech)); process.exit(2); }
while (speech.length > N) { let k = 0, g = 1e9; for (let i = 0; i < speech.length - 1; i++) { const d = speech[i + 1][0] - speech[i][1]; if (d < g) { g = d; k = i; } } speech.splice(k, 2, [speech[k][0], speech[k + 1][1]]); }
const at = Math.max(0, first - speech[0][0]); // מתי (בציר הזמן) מתחיל קובץ הקריינות
const r2 = x => Math.round(x * 100) / 100;
cfg.cues.forEach((c, i) => { c.start = r2(speech[i][0] + at); c.end = r2(speech[i][1] + at); });
cfg.audio.narration = 'narration.mp3'; cfg.audio.narrationAt = r2(at);
console.log('narration starts at t=' + r2(at) + 's'); console.table(cfg.cues.map(c => ({ id: c.id, shot: c.shot, start: c.start, end: c.end, text: c.text })));
if (!args.includes('--dry')) {
  fs.writeFileSync(CFGP, JSON.stringify(cfg, null, 2) + '\n');
  fs.mkdirSync(`${GAME}/public/intro`, { recursive: true });
  if (path.resolve(file) !== path.resolve(`${GAME}/public/intro/narration.mp3`)) fs.copyFileSync(file, `${GAME}/public/intro/narration.mp3`);
  console.log('updated', CFGP, '\nnext: cd game && npm run build, then deploy the preview');
}
