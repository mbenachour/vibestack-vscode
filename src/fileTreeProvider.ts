import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No workspace folder');
            return Promise.resolve([]);
        }

        const dirPath = element ? element.resourceUri.fsPath : this.workspaceRoot;

        if (this.pathExists(dirPath)) {
            return Promise.resolve(this.getFileItems(dirPath));
        } else {
            return Promise.resolve([]);
        }
    }

    private getFileItems(dirPath: string): FileTreeItem[] {
        const items: FileTreeItem[] = [];

        if (!fs.existsSync(dirPath)) {
            return items;
        }

        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);
            const isDirectory = stat.isDirectory();

            const item = new FileTreeItem(
                entry,
                vscode.Uri.file(fullPath),
                isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                isDirectory
            );

            items.push(item);
        }

        // Sort: directories first, then files, both alphabetically
        return items.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.label!.toString().localeCompare(b.label!.toString());
            }
            return a.isDirectory ? -1 : 1;
        });
    }

    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p);
        } catch (err) {
            return false;
        }
        return true;
    }
}

export class FileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly resourceUri: vscode.Uri,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isDirectory: boolean
    ) {
        super(resourceUri, collapsibleState);

        this.tooltip = this.resourceUri.fsPath;
        this.description = '';

        if (isDirectory) {
            this.contextValue = 'directory';
            this.iconPath = new vscode.ThemeIcon('folder');
        } else {
            this.contextValue = 'file';
            this.iconPath = vscode.ThemeIcon.File;
            this.command = {
                command: 'vibestackFileTree.openFile',
                title: 'Open File',
                arguments: [this.resourceUri]
            };
        }
    }
}
