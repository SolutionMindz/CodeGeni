#!/usr/bin/env python3
"""
Create CodeGeni brand logo icon from the user's image.
The user provided a dark background image with orange genie mascot and CodeGeni text.
"""
import sys
import os

# Note: User should place their brand image as 'brand-source.png' in this directory
# Then run: python3 create_icon_from_brand.py

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow library not found.")
    print("Install with: pip install Pillow")
    sys.exit(1)

def create_icon_from_brand(input_path, output_path, size=(128, 128)):
    """Create VS Code extension icon from brand image."""
    try:
        # Open the brand image
        img = Image.open(input_path)
        print(f"Original size: {img.size}")
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Resize to icon size with high quality
        img_resized = img.resize(size, Image.Resampling.LANCZOS)
        
        # Save as PNG
        img_resized.save(output_path, 'PNG', optimize=True)
        print(f"✓ Created {output_path} ({size[0]}x{size[1]})")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    # Check if brand source exists
    brand_source = "brand-source.png"
    
    if not os.path.exists(brand_source):
        print(f"ERROR: {brand_source} not found!")
        print("Please save your brand image as 'brand-source.png' in this directory.")
        sys.exit(1)
    
    # Create 128x128 icon for VS Code extension
    success = create_icon_from_brand(brand_source, "icon.png", (128, 128))
    
    if success:
        print("\n✓ Icon generation complete!")
        print("  The extension will use icon.png (128x128)")
        print("\nNext steps:")
        print("  1. Rebuild extension: npm run compile")
        print("  2. Package: npx @vscode/vsce package")
    else:
        print("\n✗ Icon generation failed!")
        sys.exit(1)
