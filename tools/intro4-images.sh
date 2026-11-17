#!/bin/bash
# מכין את תמונות הפתיחה מהקבצים של אמיתי: שולחן המכתבים והנר, והגב שלה בחלון.
# שימוש: bash tools/intro4-images.sh <desk.png> <back.png>
set -e
ATT=/home/box/agent-data/agents/f3892e09-3376-42f1-8919-39681f42848f/attachments
DESK=${1:-$ATT/7304db2ed7090689b689f7098c4bcd832d497d920b864679deb1f47ec02c1721.png}
BACK=${2:-$ATT/5cfea5484edb61286aa375480c52ba82e01f10b7e4a7bb66441d68add15496eb.png}
C=/workspace/dona-gracia/game/src/components
for f in "$DESK" "$BACK"; do [ -f "$f" ] || { echo "missing: $f"; exit 1; }; done
python3 - "$DESK" "$BACK" "$C" <<'PY'
import sys; from PIL import Image
desk,back,C=sys.argv[1:4]
for src,dst,maxw,q in [(desk,'intro-desk.webp',2200,80),(back,'intro-back.webp',2200,82)]:
    im=Image.open(src).convert('RGB')
    if im.width>maxw: im=im.resize((maxw,round(im.height*maxw/im.width)),Image.LANCZOS)
    im.save(f'{C}/{dst}','WEBP',quality=q,method=6); print(dst,im.size)
PY
ls -la $C/intro-*.webp
