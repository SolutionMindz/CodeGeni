#!/bin/bash
# Quick script to update the CodeGeni extension icon with your brand image
#
# INSTRUCTIONS:
# 1. Save your brand image (the one with orange genie + CodeGeni text) to this directory
#    Name it: brand-logo-source.png
#
# 2. Run this script: bash update-brand-icon.sh
#
# This will:
#   - Resize your brand image to 128x128 for VS Code
#   - Copy it to icon.png
#   - Copy it to assets/
#   - Rebuild the extension

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🎨 CodeGeni Brand Icon Updater"
echo "================================"

# Check if source image exists
if [ ! -f "$SCRIPT_DIR/brand-logo-source.png" ]; then
    echo "❌ Error: brand-logo-source.png not found!"
    echo ""
    echo "Please save your brand image (orange genie + CodeGeni text) as:"
    echo "  $SCRIPT_DIR/brand-logo-source.png"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ Found brand-logo-source.png"

# Activate venv and use Python to resize
echo "📐 Resizing to 128x128..."
"$PROJECT_ROOT/.venv/bin/python3" << 'PYTHON_SCRIPT'
from PIL import Image
import sys

try:
    # Open source image
    img = Image.open('brand-logo-source.png')
    print(f"  Original size: {img.size}")
    
    # Convert to RGBA
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Resize to 128x128
    img_128 = img.resize((128, 128), Image.Resampling.LANCZOS)
    
    # Save as icon.png
    img_128.save('icon.png', 'PNG', optimize=True)
    print("  ✓ Created icon.png (128x128)")
    
    # Also create larger sizes
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    img_256.save('logo-256.png', 'PNG', optimize=True)
    print("  ✓ Created logo-256.png (256x256)")
    
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save('logo-512.png', 'PNG', optimize=True)
    print("  ✓ Created logo-512.png (512x512)")
    
    img_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_1024.save('logo-1024.png', 'PNG', optimize=True)
    print("  ✓ Created logo-1024.png (1024x1024)")
    
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -ne 0 ]; then
    echo "❌ Failed to resize image"
    exit 1
fi

# Copy to assets folder
echo "📁 Copying to assets folder..."
mkdir -p "$PROJECT_ROOT/assets"
cp icon.png "$PROJECT_ROOT/assets/logo-128.png"
cp logo-256.png "$PROJECT_ROOT/assets/"
cp logo-512.png "$PROJECT_ROOT/assets/"
cp logo-1024.png "$PROJECT_ROOT/assets/"
echo "  ✓ Copied all sizes to assets/"

# Rebuild extension
echo "🔨 Rebuilding VS Code extension..."
npm run compile
npx --yes @vscode/vsce package

echo ""
echo "✅ SUCCESS! Brand icon updated!"
echo ""
echo "📦 New extension package:"
echo "  $(pwd)/codegeni-0.0.1.vsix"
echo ""
echo "🚀 To install in VS Code:"
echo "  1. Extensions panel → '...' menu → 'Install from VSIX...'"
echo "  2. Select the .vsix file above"
echo "  3. Reload VS Code"
echo ""
echo "You should now see your orange genie logo!"
