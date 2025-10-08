import * as vscode from 'vscode';
import { DiagramPanel } from './diagramPanel';
import { getFileTree, fileTreeToString, findReadmeFiles, readReadmeContent } from './fileTreeUtils';
import { OpenAIClient } from './openaiClient';

export function activate(context: vscode.ExtensionContext) {
    // Register command to generate and display diagram
    context.subscriptions.push(
        vscode.commands.registerCommand('vibestackFileTree.openPanel', async () => {
            // Show empty panel first
            DiagramPanel.createOrShow(context.extensionUri, '', '');
        })
    );

    // Register command to actually generate the diagram
    context.subscriptions.push(
        vscode.commands.registerCommand('vibestackFileTree.generateDiagram', async () => {
            await generateDiagram(context);
        })
    );

    // Show empty panel on activation
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        DiagramPanel.createOrShow(context.extensionUri, '', workspaceFolder.uri.fsPath);
    }
}

async function generateDiagram(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Get API key from settings
    const config = vscode.workspace.getConfiguration('vibestack');
    let apiKey = config.get<string>('openaiApiKey');

    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API Key',
            password: true,
            placeHolder: 'sk-...'
        });

        if (!apiKey) {
            vscode.window.showErrorMessage('OpenAI API key is required');
            return;
        }

        // Optionally save it
        const save = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Save API key to settings?'
        });

        if (save === 'Yes') {
            await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
        }
    }

    // Show progress
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating architecture diagram',
        cancellable: false
    }, async (progress) => {
        try {
            progress.report({ message: 'Reading project structure...' });

            // Get file tree
            const rootPath = workspaceFolder.uri.fsPath;
            const fileTree = getFileTree(rootPath);
            const fileTreeString = fileTree ? fileTreeToString(fileTree) : '';

            // Get README content
            const readmeFiles = findReadmeFiles(rootPath);
            const readmeContent = readReadmeContent(readmeFiles);

            progress.report({ message: 'Analyzing architecture (Step 1/3)...' });

            // Initialize OpenAI client
            const openaiClient = new OpenAIClient(apiKey);

            // Step 1: Generate explanation
            const explanation = await openaiClient.generateExplanation(fileTreeString, readmeContent);

            progress.report({ message: 'Mapping components (Step 2/3)...' });

            // Step 2: Generate component mapping
            const componentMapping = await openaiClient.generateComponentMapping(explanation, fileTreeString);

            progress.report({ message: 'Creating diagram (Step 3/3)...' });

            // Step 3: Generate Mermaid diagram
            const mermaidCode = await openaiClient.generateMermaidDiagram(explanation, componentMapping);

            progress.report({ message: 'Rendering diagram...' });

            // Display in panel
            DiagramPanel.createOrShow(context.extensionUri, mermaidCode, rootPath);

            vscode.window.showInformationMessage('Architecture diagram generated successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to generate diagram: ${errorMessage}`);
            console.error('Diagram generation error:', error);
        }
    });
}

export function deactivate() {}
