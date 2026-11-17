# מציב כל משפט מהקלטת הקריינות במקום שלו בציר הזמן של הפתיחה, ובונה narration.mp3 אחד מסונכרן מ-t=0.
# שימוש: python tools/intro-narration-place.py raw.ogg  (הקבוצות למטה = אילו קטעי דיבור מרכיבים כל משפט)
# הקצב הפנימי של כל משפט נשמר בדיוק כמו שהוקלט; משנים רק את ההפסקות בין המשפטים.
import sys, json, subprocess, numpy as np, soundfile as sf
RAW = sys.argv[1]; SR = 48000
GAME = '/workspace/dona-gracia/game'; CFGP = f'{GAME}/src/components/intro-cues.json'
# קטעי המשפטים בהקלטה (שניות), אומתו מול תמלול וזיהוי שקטים, 17.11.2026
SEG = {'n1': (0.37, 3.37), 'n2': (4.28, 9.22), 'n3': (10.02, 13.08), 'n4': (14.22, 15.32), 'n5': (16.02, 18.18),
       'n6': (18.93, 22.53), 'n7': (23.50, 25.09), 'n8': (25.98, 29.50), 'n9': (30.61, 31.99), 'n10': (32.39, 33.98),
       'n11': (34.66, 37.04), 'n12': (37.87, 38.80), 'n13': (39.54, 42.48), 'n14': (43.36, 46.04)}
# זמני ההתחלה הרצויים (הציר המתוכנן); משפט לא מתחיל לפני שהקודם נגמר + הפסקה
WANT = {'n1': 5.4, 'n2': 7.6, 'n3': 12.3, 'n4': 15.6, 'n5': 18.0, 'n6': 20.9, 'n7': 25.1, 'n8': 27.6,
        'n9': 32.3, 'n10': 37.4, 'n11': 41.2, 'n12': 45.4, 'n13': 47.4, 'n14': 51.6}
PAUSE_SAME, PAUSE_CUT = 0.5, 0.8
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', RAW, '-ac', '1', '-ar', str(SR), '-af', 'highpass=f=80', '-f', 'f32le', '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.float32)
cfg = json.load(open(CFGP)); cues = cfg['cues']
out = np.zeros(int(60 * SR), np.float32); prev_end = 0; prev_shot = None
for c in cues:
    s, e = SEG[c['id']]; s0, e0 = max(0, s - 0.08), e + 0.15            # שוליים קטנים לנשימה ולזנב
    clip = a[int(s0 * SR):int(e0 * SR)].copy(); n = int(0.03 * SR)
    clip[:n] *= np.linspace(0, 1, n); clip[-n:] *= np.linspace(1, 0, n)
    gap = PAUSE_CUT if prev_shot and prev_shot != c['shot'] else PAUSE_SAME
    st = max(WANT[c['id']], prev_end + gap)
    out[int((st - (s - s0)) * SR):int((st - (s - s0)) * SR) + len(clip)] += clip
    c['start'] = round(st, 2); c['end'] = round(st + (e - s), 2); prev_end = c['end']; prev_shot = c['shot']
out = out[:int((prev_end + 1.0) * SR)]
sf.write('/tmp/narr-placed.wav', out, SR)
# נרמול לקול ברור ואחיד: -16 LUFS, דחיסה עדינה
J = subprocess.run(['ffmpeg', '-v', 'info', '-i', '/tmp/narr-placed.wav', '-af', 'acompressor=threshold=-24dB:ratio=2.5:attack=8:release=180,loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(J[J.rindex('{'):J.rindex('}') + 1])
af = f"acompressor=threshold=-24dB:ratio=2.5:attack=8:release=180,loudnorm=I=-16:TP=-1.5:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=44100"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/tmp/narr-placed.wav', '-af', af, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k', f'{GAME}/public/intro/narration.mp3'], check=True)
cfg['audio']['narration'] = 'narration.mp3'; cfg['audio']['narrationAt'] = 0
json.dump(cfg, open(CFGP, 'w'), ensure_ascii=False, indent=2); open(CFGP, 'a').write('\n')
for c in cues: print(f"{c['id']:4} {c['shot']:7} {c['start']:6.2f}-{c['end']:6.2f}  {c['text']}")
