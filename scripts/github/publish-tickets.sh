#!/bin/bash
set -e
IN="$1"; OUT="$(dirname "$IN")/split"; rm -rf "$OUT"; mkdir -p "$OUT"
awk -v out="$OUT" 'BEGIN{n=0}
  /^@@@TICKET@@@$/ {n++; f=sprintf("%s/%03d.txt", out, n); next}
  n>0 {print > f}' "$IN"
for f in "$OUT"/*.txt; do
  title=$(head -1 "$f")
  tail -n +2 "$f" > "$f.body"
  url=$(gh issue create --title "$title" --body-file "$f.body" --label ready-for-agent | tail -1)
  echo "$(basename "$url")  $title"
done
