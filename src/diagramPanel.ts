import * as vscode from 'vscode';
import * as path from 'path';

export class DiagramPanel {
    public static currentPanel: DiagramPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _mermaidCode: string;
    private _rootPath: string;
    private _hasApiKey: boolean;

    public static createOrShow(extensionUri: vscode.Uri, mermaidCode: string, rootPath: string, hasApiKey: boolean = false) {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, update it
        if (DiagramPanel.currentPanel) {
            DiagramPanel.currentPanel._mermaidCode = mermaidCode;
            DiagramPanel.currentPanel._rootPath = rootPath;
            DiagramPanel.currentPanel._hasApiKey = hasApiKey;
            DiagramPanel.currentPanel._panel.reveal(column);
            DiagramPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'vibestackDiagram',
            'Architecture Diagram',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        DiagramPanel.currentPanel = new DiagramPanel(panel, extensionUri, mermaidCode, rootPath, hasApiKey);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, mermaidCode: string, rootPath: string, hasApiKey: boolean) {
        this._panel = panel;
        this._mermaidCode = mermaidCode;
        this._rootPath = rootPath;
        this._hasApiKey = hasApiKey;

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
                    case 'generate':
                        vscode.commands.executeCommand('vibestackFileTree.generateDiagram');
                        break;
                    case 'setupApiKey':
                        vscode.commands.executeCommand('vibestackFileTree.setupApiKey');
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private _openFile(filePath: string) {
        // Convert relative path to absolute
        const absolutePath = path.join(this._rootPath, filePath);
        const uri = vscode.Uri.file(absolutePath);

        vscode.workspace.fs.stat(uri).then(() => {
            vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Two });
        }, () => {
            vscode.window.showErrorMessage(`File not found: ${filePath}`);
        });
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getEmptyStateMessage(): string {
        if (this._hasApiKey) {
            return '<div id="empty-state" style="color: #888; font-size: 18px; text-align: center; padding: 40px;"><h3>Architecture Diagram</h3><p>Generate a visual representation of your project\'s architecture using AI.</p><p style="color: #666; font-size: 14px;">Click "Generate Diagram" to analyze your project structure.</p></div>';
        } else {
            return '<div id="empty-state" style="color: #888; font-size: 18px; text-align: center; padding: 40px;"><h3>Architecture Diagram</h3><p>Generate a visual representation of your project\'s architecture using AI.</p><p style="color: #f48771; font-size: 14px;">⚠️ OpenAI API key required. Click "Setup API Key" to configure.</p></div>';
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Diagram</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            themeVariables: {
                darkMode: false,
                primaryTextColor: '#000',
                secondaryTextColor: '#000',
                tertiaryTextColor: '#000',
                primaryColor: '#e3f2fd',
                secondaryColor: '#bbdefb',
                tertiaryColor: '#90caf9',
                lineColor: '#333',
                textColor: '#000',
                mainBkg: '#e3f2fd',
                secondBkg: '#bbdefb',
                border1: '#333',
                border2: '#666'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });
    </script>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #000000;
            font-family: var(--vscode-font-family);
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .controls {
            padding: 10px;
            display: flex;
            gap: 10px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #ddd;
            flex-shrink: 0;
        }
        button {
            background-color: #2196F3;
            color: #ffffff;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 12px;
        }
        button:hover {
            background-color: #1976D2;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .diagram-container {
            flex: 1;
            overflow: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background-color: #ffffff;
        }
        .mermaid {
            display: inline-block;
        }
        #empty-state {
            color: #666;
        }
    </style>
</head>
<body>
    <div class="controls">
        <button onclick="generateDiagram()" id="generate-btn">Generate Diagram</button>
        ${!this._hasApiKey ? '<button onclick="setupApiKey()" id="setup-btn" style="background-color: #0078d4; margin-left: 8px;">Setup API Key</button>' : ''}
        <button onclick="zoomIn()" id="zoom-in" style="display:none;">Zoom In</button>
        <button onclick="zoomOut()" id="zoom-out" style="display:none;">Zoom Out</button>
        <button onclick="resetZoom()" id="reset-zoom" style="display:none;">Reset Zoom</button>
    </div>

    <div class="diagram-container" id="diagram-container">
        ${this._mermaidCode ? `<div class="mermaid" id="mermaid-diagram">${this._mermaidCode}</div>` : this._getEmptyStateMessage()}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentZoom = 1;
        const hasDiagram = ${!!this._mermaidCode};

        function generateDiagram() {
            const btn = document.getElementById('generate-btn');
            btn.disabled = true;
            btn.textContent = 'Generating...';
            vscode.postMessage({ command: 'generate' });
        }

        function setupApiKey() {
            // Only call if the button exists (it should only exist when API key is not set)
            if (document.getElementById('setup-btn')) {
                vscode.postMessage({ command: 'setupApiKey' });
            }
        }

        function zoomIn() {
            currentZoom += 0.1;
            applyZoom();
        }

        function zoomOut() {
            currentZoom = Math.max(0.3, currentZoom - 0.1);
            applyZoom();
        }

        function resetZoom() {
            currentZoom = 1;
            applyZoom();
        }

        function applyZoom() {
            const diagram = document.getElementById('mermaid-diagram');
            if (diagram) {
                diagram.style.transform = 'scale(' + currentZoom + ')';
                diagram.style.transformOrigin = 'center center';
            }
        }

        // Show zoom controls if diagram exists
        if (hasDiagram) {
            document.getElementById('generate-btn').style.display = 'none';
            document.getElementById('zoom-in').style.display = 'block';
            document.getElementById('zoom-out').style.display = 'block';
            document.getElementById('reset-zoom').style.display = 'block';
        }

        // Handle clicks on diagram nodes
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Check if clicked element or its parent has a data-link attribute
            let element = target;
            while (element && element !== document) {
                if (element.getAttribute && element.getAttribute('data-link')) {
                    const filePath = element.getAttribute('data-link');
                    vscode.postMessage({
                        command: 'openFile',
                        path: filePath
                    });
                    break;
                }
                element = element.parentElement;
            }
        });

        // After mermaid renders, add click handlers to nodes with click events
        window.addEventListener('load', () => {
            setTimeout(() => {
                const svgElement = document.querySelector('.mermaid svg');
                if (svgElement) {
                    // Find all nodes with click events in the mermaid code
                    const clickEvents = ${JSON.stringify(this._extractClickEvents(this._mermaidCode))};

                    clickEvents.forEach(event => {
                        // Find the node in the SVG
                        const nodes = svgElement.querySelectorAll('[id*="' + event.nodeId + '"]');
                        nodes.forEach(node => {
                            node.style.cursor = 'pointer';
                            node.setAttribute('data-link', event.path);
                        });
                    });
                }
            }, 1000);
        });
    </script>
</body>
</html>`;
    }

    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private _extractClickEvents(mermaidCode: string): Array<{ nodeId: string, path: string }> {
        const clickEvents: Array<{ nodeId: string, path: string }> = [];
        const clickRegex = /click\s+(\w+)\s+"([^"]+)"/g;

        let match;
        while ((match = clickRegex.exec(mermaidCode)) !== null) {
            clickEvents.push({
                nodeId: match[1],
                path: match[2]
            });
        }

        return clickEvents;
    }

    public dispose() {
        DiagramPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
