# Installing CodeGeni Extension in VS Code

## The Issue
The extension showed "Not yet activated" because `activationEvents` was explicitly defined. Modern VS Code automatically generates activation events from command contributions.

## Fixed
Removed the explicit `activationEvents` field from `package.json`.

## Install the Extension

### Method 1: Using VS Code UI (Recommended)
1. Open VS Code
2. Go to Extensions panel (Cmd+Shift+X or View → Extensions)
3. Click the "..." menu (three dots) at the top right
4. Select "Install from VSIX..."
5. Navigate to: `/Users/sanjeev/Sites/localhost/CodeGeni/extensions/vscode-codegeni/codegeni-0.0.1.vsix`
6. Click "Install"
7. Reload VS Code when prompted

### Method 2: Using Terminal (if you have 'code' command)
```bash
# First, ensure VS Code 'code' command is in PATH
# (In VS Code: Cmd+Shift+P → "Shell Command: Install 'code' command in PATH")

code --install-extension /Users/sanjeev/Sites/localhost/CodeGeni/extensions/vscode-codegeni/codegeni-0.0.1.vsix
```

## Verify Installation

1. After reloading, the extension should show "Activation: workspace" or similar
2. Open Command Palette (Cmd+Shift+P)
3. Type "CodeGeni: Scan Workspace"
4. The command should appear and be executable

## Usage

1. Make sure your Python venv is active in the terminal:
   ```bash
   source /Users/sanjeev/Sites/localhost/CodeGeni/.venv/bin/activate
   ```

2. Run the scan command from Command Palette:
   - Cmd+Shift+P → "CodeGeni: Scan Workspace"
   - This will open a terminal and run: `codegeni scan . --format json`

## Next Steps

The current extension opens a terminal and runs the CLI. Future enhancements:
- Parse JSON output and show diagnostics in Problems panel
- Add inline Code Actions for suggestions
- Create a webview panel for summary/dashboard
