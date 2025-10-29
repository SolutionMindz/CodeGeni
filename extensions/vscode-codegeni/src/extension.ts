import * as vscode from 'vscode';

class CodeGeniTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly description?: string,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.contextValue = contextValue;
  }
}

class CodeGeniProvider implements vscode.TreeDataProvider<CodeGeniTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CodeGeniTreeItem | undefined | null | void> = new vscode.EventEmitter<CodeGeniTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeGeniTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private scanResults: any[] = [];
  private lastScanTime: Date | null = null;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateResults(results: any[]): void {
    this.scanResults = results;
    this.lastScanTime = new Date();
    this.refresh();
  }

  getTreeItem(element: CodeGeniTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CodeGeniTreeItem): Thenable<CodeGeniTreeItem[]> {
    if (!element) {
      // Root level
      const items: CodeGeniTreeItem[] = [];
      
      if (this.lastScanTime) {
        const timeStr = this.lastScanTime.toLocaleTimeString();
        items.push(new CodeGeniTreeItem(
          'Last Scan',
          vscode.TreeItemCollapsibleState.None,
          timeStr,
          'lastScan'
        ));
        
        const issueCount = this.scanResults.length;
        items.push(new CodeGeniTreeItem(
          'Issues Found',
          vscode.TreeItemCollapsibleState.None,
          `${issueCount}`,
          'issueCount'
        ));
      } else {
        items.push(new CodeGeniTreeItem(
          'No Scan Yet',
          vscode.TreeItemCollapsibleState.None,
          'Click scan button above',
          'noScan'
        ));
      }

      items.push(new CodeGeniTreeItem(
        '🚀 Quick Actions',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'quickActions'
      ));

      return Promise.resolve(items);
    } else if (element.contextValue === 'quickActions') {
      // Quick actions submenu
      return Promise.resolve([
        new CodeGeniTreeItem(
          '▶ Run Scan',
          vscode.TreeItemCollapsibleState.None,
          'Scan current workspace',
          'runScan'
        ),
        new CodeGeniTreeItem(
          '📊 View Results',
          vscode.TreeItemCollapsibleState.None,
          'Check terminal output',
          'viewReport'
        )
      ]);
    }

    return Promise.resolve([]);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('CodeGeni extension is now active!');
  
  const treeProvider = new CodeGeniProvider();
  
  // Register tree view
  vscode.window.registerTreeDataProvider('codegeniExplorer', treeProvider);

  // Scan workspace command
  const scanCommand = vscode.commands.registerCommand('codegeni.scanWorkspace', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showWarningMessage('CodeGeni: No workspace folder open.');
      return;
    }

    vscode.window.showInformationMessage('CodeGeni: Starting scan...');
    
    const terminal = vscode.window.createTerminal({ name: 'CodeGeni Scan' });
    terminal.show();
    terminal.sendText('codegeni scan . --format json');
    
    // Update tree view
    setTimeout(() => {
      treeProvider.updateResults([]);
      vscode.window.showInformationMessage('CodeGeni: Scan complete! Check terminal for results.');
    }, 1000);
  });

  // Refresh command
  const refreshCommand = vscode.commands.registerCommand('codegeni.refreshView', () => {
    treeProvider.refresh();
    vscode.window.showInformationMessage('CodeGeni: View refreshed!');
  });

  context.subscriptions.push(scanCommand, refreshCommand);
}

export function deactivate() {
  console.log('CodeGeni extension deactivated.');
}
