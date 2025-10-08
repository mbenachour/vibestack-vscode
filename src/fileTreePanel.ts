import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileTreePanel {
    public static currentPanel: FileTreePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (FileTreePanel.currentPanel) {
            FileTreePanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'vibestackFileTree',
            'VibeStack File Tree',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        FileTreePanel.currentPanel = new FileTreePanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openFile':
                        this._openFile(message.path);
                        break;
                    case 'getChildren':
                        this._getChildren(message.path);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private _openFile(filePath: string) {
        const uri = vscode.Uri.file(filePath);
        vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Two });
    }

    private _getChildren(dirPath: string) {
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!rootPath) {
            return;
        }

        const targetPath = dirPath || rootPath;
        const items = this._readDirectory(targetPath);

        this._panel.webview.postMessage({
            command: 'updateChildren',
            path: dirPath,
            items: items
        });
    }

    private _readDirectory(dirPath: string): any[] {
        if (!fs.existsSync(dirPath)) {
            return [];
        }

        const entries = fs.readdirSync(dirPath);
        const items: any[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            let stat;

            try {
                stat = fs.statSync(fullPath);
            } catch (err) {
                continue;
            }

            items.push({
                name: entry,
                path: fullPath,
                isDirectory: stat.isDirectory()
            });
        }

        // Sort: directories first, then files
        return items.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);

        // Send initial directory structure
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (rootPath) {
            const items = this._readDirectory(rootPath);
            setTimeout(() => {
                this._panel.webview.postMessage({
                    command: 'initialize',
                    rootPath: rootPath,
                    items: items
                });
            }, 100);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Tree</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .tree {
            list-style: none;
            padding-left: 0;
            margin: 0;
        }
        .tree ul {
            list-style: none;
            padding-left: 20px;
            margin: 0;
        }
        .tree-item {
            padding: 4px 8px;
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            border-radius: 3px;
        }
        .tree-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .tree-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        .icon {
            margin-right: 6px;
            width: 16px;
            display: inline-block;
        }
        .folder {
            font-weight: 500;
        }
        .folder.collapsed > .children {
            display: none;
        }
        .folder.expanded > .children {
            display: block;
        }
        .toggle {
            display: inline-block;
            width: 16px;
            text-align: center;
            margin-right: 4px;
        }
    </style>
</head>
<body>
    <div id="tree-container">
        <ul class="tree" id="root-tree"></ul>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let rootPath = '';
        const expandedFolders = new Set();

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'initialize':
                    rootPath = message.rootPath;
                    renderTree(message.items, document.getElementById('root-tree'), rootPath);
                    break;
                case 'updateChildren':
                    updateFolder(message.path, message.items);
                    break;
            }
        });

        function renderTree(items, container, basePath) {
            container.innerHTML = '';

            items.forEach(item => {
                const li = document.createElement('li');
                const div = document.createElement('div');
                div.className = 'tree-item';

                if (item.isDirectory) {
                    li.className = 'folder collapsed';
                    const toggle = document.createElement('span');
                    toggle.className = 'toggle';
                    toggle.textContent = '▸';
                    div.appendChild(toggle);

                    const icon = document.createElement('span');
                    icon.className = 'icon';
                    icon.textContent = '📁';
                    div.appendChild(icon);

                    const name = document.createElement('span');
                    name.textContent = item.name;
                    name.className = 'folder';
                    div.appendChild(name);

                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleFolder(li, item.path);
                    });

                    const childrenUl = document.createElement('ul');
                    childrenUl.className = 'children';
                    li.appendChild(div);
                    li.appendChild(childrenUl);
                } else {
                    const icon = document.createElement('span');
                    icon.className = 'icon';
                    icon.textContent = '📄';
                    div.appendChild(icon);

                    const name = document.createElement('span');
                    name.textContent = item.name;
                    div.appendChild(name);

                    div.addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'openFile',
                            path: item.path
                        });
                    });

                    li.appendChild(div);
                }

                container.appendChild(li);
            });
        }

        function toggleFolder(folderElement, folderPath) {
            const isCollapsed = folderElement.classList.contains('collapsed');
            const childrenContainer = folderElement.querySelector('.children');
            const toggle = folderElement.querySelector('.toggle');

            if (isCollapsed) {
                folderElement.classList.remove('collapsed');
                folderElement.classList.add('expanded');
                toggle.textContent = '▾';

                if (childrenContainer.children.length === 0) {
                    vscode.postMessage({
                        command: 'getChildren',
                        path: folderPath
                    });
                }
            } else {
                folderElement.classList.remove('expanded');
                folderElement.classList.add('collapsed');
                toggle.textContent = '▸';
            }
        }

        function updateFolder(folderPath, items) {
            const folderElements = document.querySelectorAll('.folder');

            for (const folderElement of folderElements) {
                const folderName = folderElement.querySelector('span:not(.toggle):not(.icon)');
                const childrenContainer = folderElement.querySelector('.children');

                if (childrenContainer && folderElement.classList.contains('expanded')) {
                    const currentPath = getFolderPath(folderElement);
                    if (currentPath === folderPath) {
                        renderTree(items, childrenContainer, folderPath);
                        break;
                    }
                }
            }
        }

        function getFolderPath(element) {
            const parts = [];
            let current = element;

            while (current && current.id !== 'root-tree') {
                const nameSpan = current.querySelector('.tree-item > span:not(.toggle):not(.icon)');
                if (nameSpan) {
                    parts.unshift(nameSpan.textContent);
                }
                current = current.parentElement.closest('.folder');
            }

            return parts.length > 0 ? rootPath + '/' + parts.join('/') : rootPath;
        }

        // Request initial data
        vscode.postMessage({ command: 'getChildren', path: '' });
    </script>
</body>
</html>`;
    }

    public dispose() {
        FileTreePanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
