#!/bin/bash
set -e

FONTS_DIR="$(dirname "$0")"
cd "$FONTS_DIR"

echo "📥 Downloading Satoshi fonts from Fontshare..."
curl -L "https://api.fontshare.com/v2/fonts/download/satoshi" -o satoshi.zip
unzip -o satoshi.zip -d satoshi_temp
find satoshi_temp -name "*.ttf" -exec mv {} . \;
rm -rf satoshi.zip satoshi_temp

echo "📥 Downloading Poppins fonts from Google Fonts..."
# Download regular, medium, semibold, and bold weights
WEIGHTS=("Regular" "Medium" "SemiBold" "Bold")
for weight in "${WEIGHTS[@]}"; do
  curl -L "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-${weight}.ttf" -o "Poppins-${weight}.ttf"
done

echo "✅ Fonts downloaded successfully!"
echo "📁 Location: $FONTS_DIR"
ls -lh *.ttf
