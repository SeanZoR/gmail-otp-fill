#!/bin/sh
# Builds dist/gmail-otp-fill-<version>.zip with only the files Chrome needs.
set -e
cd "$(dirname "$0")/.."
version=$(node -p "require('./manifest.json').version")
out="dist/gmail-otp-fill-$version.zip"
mkdir -p dist
rm -f "$out"
zip -qr "$out" manifest.json background.js content.js extract.js \
  options.html options.js popup.html popup.js ui.css icons LICENSE
echo "$out"
