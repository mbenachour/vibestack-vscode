import * as vscode from 'vscode';
import { DiagramPanel } from './diagramPanel';
import { getFileTree, fileTreeToString, findReadmeFiles, readReadmeContent } from './fileTreeUtils';
import { OpenAIClient } from './openaiClient';

export function activate(context: vscode.ExtensionContext) {
    // Register command to generate and display diagram
    context.subscriptions.push(
        vscode.commands.registerCommand('vibestackFileTree.openPanel', async () => {
            // Show empty panel first
            DiagramPanel.createOrShow(context.extensionUri, '', '', hasApiKey());
        })
    );

    // Register command to actually generate the diagram
    context.subscriptions.push(
        vscode.commands.registerCommand('vibestackFileTree.generateDiagram', async () => {
            await generateDiagram(context);
        })
    );

    // Register command to set up API key
    context.subscriptions.push(
        vscode.commands.registerCommand('vibestackFileTree.setupApiKey', async () => {
            await setupApiKey(context.extensionUri);
        })
    );

    // Show empty panel on activation
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        DiagramPanel.createOrShow(context.extensionUri, '', workspaceFolder.uri.fsPath, hasApiKey());
    }
}

function hasApiKey(): boolean {
    const config = vscode.workspace.getConfiguration('vibestack');
    const apiKey = config.get<string>('openaiApiKey');
    return !!(apiKey && apiKey.trim() !== '');
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

    // Check if API key is set up
    if (!apiKey || apiKey.trim() === '') {
        const setupChoice = await vscode.window.showInformationMessage(
            'OpenAI API key is required to generate diagrams. Would you like to set it up now?',
            { modal: true },
            'Set Up API Key',
            'Open Settings',
            'Cancel'
        );

        if (setupChoice === 'Set Up API Key') {
            apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your OpenAI API Key (get one at https://platform.openai.com/api-keys)',
                password: true,
                placeHolder: 'sk-proj-...',
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'API key cannot be empty';
                    }
                    if (!value.startsWith('sk-')) {
                        return 'OpenAI API keys typically start with "sk-"';
                    }
                    return null;
                }
            });

            if (!apiKey) {
                vscode.window.showWarningMessage('Diagram generation cancelled - API key is required');
                return;
            }

            // Save the API key
            await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('OpenAI API key saved successfully!');
        } else if (setupChoice === 'Open Settings') {
            // Open VS Code settings to the specific setting
            vscode.commands.executeCommand('workbench.action.openSettings', 'vibestack.openaiApiKey');
            return;
        } else {
            vscode.window.showWarningMessage('Diagram generation cancelled - API key is required');
            return;
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

            // Display in panel (API key is confirmed to exist at this point)
            DiagramPanel.createOrShow(context.extensionUri, mermaidCode, rootPath, true);

            vscode.window.showInformationMessage('Architecture diagram generated successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to generate diagram: ${errorMessage}`);
            console.error('Diagram generation error:', error);
        }
    });
}

async function setupApiKey(extensionUri?: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('vibestack');
    const currentApiKey = config.get<string>('openaiApiKey');

    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API Key (get one at https://platform.openai.com/api-keys)',
        password: true,
        placeHolder: 'sk-proj-...',
        value: currentApiKey || '',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'API key cannot be empty';
            }
            if (!value.startsWith('sk-')) {
                return 'OpenAI API keys typically start with "sk-"';
            }
            return null;
        }
    });

    if (apiKey) {
        await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('OpenAI API key saved successfully!');
        
        // Refresh the panel to hide the setup button
        if (DiagramPanel.currentPanel && extensionUri) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                DiagramPanel.createOrShow(extensionUri, '', workspaceFolder.uri.fsPath, true);
            }
        }
    } else {
        vscode.window.showWarningMessage('API key setup cancelled');
    }
}

export function deactivate() {}
