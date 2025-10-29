#!/usr/bin/env python3
"""
Resize CodeGeni brand logo to proper icon sizes for VS Code extension.
VS Code recommends 128x128 pixels for extension icons.
"""
import sys

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow library not found.")
    print("Install with: pip install Pillow")
    sys.exit(1)

def resize_icon(input_path, output_path, size=(128, 128)):
    """Resize image to specified size with high quality."""
    try:
        # Open the image
        img = Image.open(input_path)
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Use high-quality resampling
        img_resized = img.resize(size, Image.Resampling.LANCZOS)
        
        # Save as PNG
        img_resized.save(output_path, 'PNG', optimize=True)
        print(f"✓ Created {output_path} ({size[0]}x{size[1]})")
        
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python resize_icon.py <input_image>")
        sys.exit(1)
    
    input_image = sys.argv[1]
    
    # Create 128x128 icon for VS Code extension
    resize_icon(input_image, "icon.png", (128, 128))
    
    print("\n✓ Icon generation complete!")
    print("  - icon.png (128x128) - VS Code extension icon")
