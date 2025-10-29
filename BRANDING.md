# CodeGeni Logo & Branding

## Logo Files

### Main Logo
- **logo.svg** - Full brand logo (400x400px) with CodeGeni text
  - Primary colors: Indigo-Purple gradient (#6366f1 → #8b5cf6)
  - Accent colors: Green-Cyan gradient (#10b981 → #06b6d4)
  - Features: Code brackets, AI lightning bolt, quality metrics dots

### VS Code Extension Icon
- **extensions/vscode-codegeni/icon.svg** - Extension icon (128x128px)
  - Same design as main logo, optimized for small sizes
  - Rounded square format for VS Code marketplace

## Design Elements

### Symbolism
- **Code Brackets `{ }`** - Represents code analysis
- **Lightning Bolt** - Symbolizes AI-powered intelligence
- **Accent Dots** - Quality metrics and insights
- **Purple Gradient** - Modern, tech-forward aesthetic
- **Green-Cyan Accent** - Success, validation, approval

## Converting SVG to PNG

For VS Code extension publishing, convert the icon to PNG:

### Option 1: Online Converter
1. Visit https://cloudconvert.com/svg-to-png
2. Upload `extensions/vscode-codegeni/icon.svg`
3. Set dimensions to 128x128px
4. Download as `icon.png`

### Option 2: Using ImageMagick (if installed)
```bash
cd extensions/vscode-codegeni
convert -background none -resize 128x128 icon.svg icon.png
```

### Option 3: Using rsvg-convert (if installed)
```bash
cd extensions/vscode-codegeni
rsvg-convert -w 128 -h 128 icon.svg -o icon.png
```

### Option 4: Using macOS/Preview
1. Open `icon.svg` in Preview
2. File → Export
3. Format: PNG
4. Resolution: 128x128px
5. Save as `icon.png`

## Brand Colors

### Primary Palette
- Indigo: `#6366f1` (RGB: 99, 102, 241)
- Purple: `#8b5cf6` (RGB: 139, 92, 246)

### Accent Palette
- Emerald: `#10b981` (RGB: 16, 185, 129)
- Cyan: `#06b6d4` (RGB: 6, 182, 212)

### Supporting
- White: `#ffffff` (for text and icons)
- Background: Gradient from primary colors

## Usage Guidelines

### Do's
✓ Use logo on dark or gradient backgrounds
✓ Maintain minimum clear space around logo
✓ Scale proportionally
✓ Use provided color values

### Don'ts
✗ Don't distort or skew the logo
✗ Don't change brand colors
✗ Don't add effects or shadows
✗ Don't place on busy backgrounds
