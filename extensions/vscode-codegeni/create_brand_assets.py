#!/usr/bin/env python3
"""
Create full-size brand logos from the CodeGeni icon.
This scales up the icon to create larger marketing/documentation assets.
"""
from PIL import Image

def create_brand_assets():
    """Create various sized brand assets from the icon."""
    try:
        # Load the icon
        icon = Image.open('icon.png')
        print(f"Source icon: {icon.size}")
        
        # Create larger brand logos
        sizes = [
            (256, 256, 'logo-256.png'),
            (512, 512, 'logo-512.png'),
            (1024, 1024, 'logo-1024.png'),
        ]
        
        for width, height, filename in sizes:
            img_scaled = icon.resize((width, height), Image.Resampling.LANCZOS)
            img_scaled.save(filename, 'PNG', optimize=True)
            print(f"✓ Created {filename} ({width}x{height})")
        
        print("\n✓ Brand assets created successfully!")
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False
    
    return True

if __name__ == "__main__":
    create_brand_assets()
