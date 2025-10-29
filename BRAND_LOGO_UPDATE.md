# 🎨 How to Add Your CodeGeni Brand Logo

## The Problem
VS Code is showing a generic purple icon instead of your orange genie brand logo.

## Why This Happened
The brand image you showed me (with the orange genie character and "CodeGeni" text on dark background) was attached in the chat, but I cannot directly save attached images to disk. The current `icon.png` file is a placeholder.

## Solution: Update the Icon (Easy - 3 Steps)

### Step 1: Save Your Brand Image
Save your brand logo image (the one from the screenshot with the orange genie) as:
```
/Users/sanjeev/Sites/localhost/CodeGeni/extensions/vscode-codegeni/brand-logo-source.png
```

**How to save it:**
- If you have the image file already, just copy it to the location above
- If it's in your chat, right-click → Save Image As → name it `brand-logo-source.png`

### Step 2: Run the Update Script
Open a terminal and run:
```bash
cd /Users/sanjeev/Sites/localhost/CodeGeni/extensions/vscode-codegeni
bash update-brand-icon.sh
```

This will automatically:
- ✓ Resize your image to 128x128 (VS Code icon size)
- ✓ Create multiple sizes (256, 512, 1024)
- ✓ Copy them to the assets folder
- ✓ Rebuild the extension package

### Step 3: Reinstall the Extension
In VS Code:
1. Go to Extensions panel (⌘⇧X)
2. Find "CodeGeni" and **Uninstall** it
3. Click the "..." menu → "Install from VSIX..."
4. Navigate to: `/Users/sanjeev/Sites/localhost/CodeGeni/extensions/vscode-codegeni/codegeni-0.0.1.vsix`
5. Click Install
6. Reload VS Code

Your orange genie logo should now appear! 🎉

---

## Alternative: Manual Method

If the script doesn't work, you can do it manually:

1. **Resize your brand image to 128x128:**
   - Use any image editor (Preview, Photoshop, online tools)
   - Save as PNG with transparency

2. **Replace the icon:**
   ```bash
   # Copy your resized image over icon.png
   cp /path/to/your/resized-brand-logo.png extensions/vscode-codegeni/icon.png
   ```

3. **Rebuild:**
   ```bash
   cd extensions/vscode-codegeni
   npm run compile
   npx @vscode/vsce package
   ```

4. **Reinstall in VS Code** (same as Step 3 above)

---

## Current Files Status

❌ **icon.png** - Currently has wrong/generic icon  
❌ **assets/logo-*.png** - Also have wrong icons  

✅ **After running the script:**
- icon.png will have your brand logo (128x128)
- assets/ will have multiple sizes (128, 256, 512, 1024)
- Extension package will include the correct logo

---

## Need Help?

If you're having trouble:
1. Make sure your brand image is saved as `brand-logo-source.png`
2. Check that Pillow is installed: `pip list | grep Pillow`
3. Run the script and share any error messages

The brand logo you showed (orange genie + CodeGeni text on dark background) should work perfectly once saved to the correct location!
