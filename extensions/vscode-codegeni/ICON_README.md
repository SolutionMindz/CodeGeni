# Converting Icon for VS Code Extension

The `icon.svg` has been created. To use it in the VS Code extension, convert it to PNG:

## Quick Steps (macOS)

1. **Using Preview (Easiest)**
   ```bash
   open -a Preview icon.svg
   ```
   Then: File → Export → Format: PNG → Save as `icon.png`

2. **Using qlmanage and sips**
   ```bash
   qlmanage -t -s 128 -o . icon.svg
   mv icon.svg.png icon.png
   ```

3. **Using online converter**
   - Visit: https://cloudconvert.com/svg-to-png
   - Upload `icon.svg`
   - Download as `icon.png`

## After conversion
Rebuild the extension:
```bash
npm run compile
npx @vscode/vsce package
```
