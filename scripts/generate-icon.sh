#!/usr/bin/env bash
# Generate macOS .icns and PNG icon assets from SVG vector source
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SVG_SRC="$ROOT_DIR/resources/icon.svg"
BUILD_DIR="$ROOT_DIR/build"
ICONSET_DIR="/tmp/Setlist_build.iconset"

mkdir -p "$BUILD_DIR"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

echo "Rendering master PNG from SVG using Quick Look..."
TMP_DIR=$(mktemp -d)
cp "$SVG_SRC" "$TMP_DIR/icon.svg"
qlmanage -t -s 1024 -o "$TMP_DIR" "$TMP_DIR/icon.svg" >/dev/null 2>&1
MASTER_PNG="$TMP_DIR/icon.svg.png"

cp "$MASTER_PNG" "$BUILD_DIR/icon.png"

echo "Generating iconset resolutions with sips..."
sips -z 16 16     "$MASTER_PNG" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
sips -z 32 32     "$MASTER_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
sips -z 32 32     "$MASTER_PNG" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
sips -z 64 64     "$MASTER_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
sips -z 128 128   "$MASTER_PNG" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
sips -z 256 256   "$MASTER_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$MASTER_PNG" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
sips -z 512 512   "$MASTER_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$MASTER_PNG" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
cp "$MASTER_PNG" "$ICONSET_DIR/icon_512x512@2x.png"

echo "Compiling .icns using iconutil..."
iconutil -c icns "$ICONSET_DIR" -o "$BUILD_DIR/icon.icns"

rm -rf "$ICONSET_DIR" "$TMP_DIR"
echo "Successfully generated: $BUILD_DIR/icon.icns and $BUILD_DIR/icon.png"
