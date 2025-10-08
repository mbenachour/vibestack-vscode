# VibeStack - AI-Powered Architecture Diagrams

A VS Code extension that generates intelligent architecture diagrams of your codebase using OpenAI's GPT models. Visualize your project structure, understand component relationships, and document your architecture effortlessly.

## ✨ Features



### 🤖 AI-Powered Diagram Generation
- **Smart Analysis**: Uses OpenAI GPT to analyze your project structure and README files
- **Multi-Step Process**: 3-stage generation (explanation → component mapping → diagram creation)
- **Mermaid Diagrams**: Generates interactive Mermaid.js architecture diagrams
- **Context-Aware**: Understands file relationships and project patterns

### 🎨 Interactive Diagram Viewer
- **Built-in Viewer**: Custom webview panel with diagram rendering
- **Zoom Controls**: Zoom in, zoom out, and reset zoom functionality
- **File Navigation**: Click on diagram components to open related files
- **Real-time Updates**: Automatically refreshes when workspace changes

### 🔧 Easy Setup & Configuration
- **API Key Management**: Simple setup wizard for OpenAI API key
- **Settings Integration**: Configure via VS Code settings or command palette
- **Smart Validation**: Input validation and helpful error messages
- **Conditional UI**: Setup button only appears when API key is not configured

## 🚀 Quick Start

### Prerequisites
- **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
- **VS Code**: Version 1.80.0 or higher

### Installation & Setup

1. **Clone and Install**:
```bash
git clone https://github.com/mbenachour/vibestack-vscode.git
cd vibestack-vscode
npm install
```

2. **Compile the Extension**:
```bash
npm run compile
```

3. **Development Mode**:
   - Press `F5` in VS Code to open Extension Development Host
   - Or run: `npm run watch` for auto-compilation during development

4. **Setup API Key**:
   - Use Command Palette: `VibeStack: Setup OpenAI API Key`
   - Or go to VS Code Settings → Extensions → VibeStack
   - Or click "Setup API Key" button in the diagram panel

## 📖 Usage

### Generate Architecture Diagrams

1. **Open VibeStack Panel**:
   - Use Command: `VibeStack: Open Diagram Panel`
   - Or click the VibeStack icon in the activity bar

2. **Generate Diagram**:
   - Click "Generate Diagram" button
   - Wait for AI analysis (3 steps: analysis → mapping → diagram)
   - View your interactive architecture diagram!

3. **Interact with Diagram**:
   - **Zoom**: Use zoom controls for better viewing
   - **Navigate**: Click diagram elements to open related files
   - **Regenerate**: Click "Generate Diagram" anytime for updates

### Commands Available

- `VibeStack: Open Diagram Panel` - Open the diagram viewer
- `VibeStack: Generate Architecture Diagram` - Generate new diagram
- `VibeStack: Setup OpenAI API Key` - Configure your API key

## 🛠️ Development

### Building
```bash
# Compile once
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Lint code
npm run lint
```

### Architecture

The extension consists of several key components:

- **`extension.ts`** - Main extension entry point and command registration
- **`diagramPanel.ts`** - Webview panel for diagram visualization
- **`openaiClient.ts`** - OpenAI API integration for AI-powered analysis
- **`fileTreeUtils.ts`** - Project structure analysis utilities
- **`prompts.ts`** - AI prompts for different analysis phases

### How It Works

1. **Project Analysis**: Scans workspace files and README content
2. **AI Processing**: 
   - Step 1: Generate project explanation
   - Step 2: Map components and relationships  
   - Step 3: Create Mermaid diagram syntax
3. **Visualization**: Render interactive diagram in webview panel

## ⚙️ Configuration

### Settings

- **`vibestack.openaiApiKey`**: Your OpenAI API key for diagram generation

### Supported Project Types

- JavaScript/TypeScript projects
- Python projects  
- Any project with clear file structure and README documentation
- Works best with modular, well-organized codebases

## 🔒 Privacy & Security

- **API Key**: Stored securely in VS Code's configuration system
- **Code Analysis**: Only file structure and README content sent to OpenAI
- **No Code Content**: Actual source code is not transmitted
- **Local Processing**: All file scanning happens locally

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### Version 0.0.1
- Initial release with AI-powered architecture diagram generation
- OpenAI integration with 3-phase analysis process
- Interactive Mermaid.js diagram viewer
- Smart API key management and setup wizard
- Conditional UI based on configuration state

## 📸 Screenshots

*Coming soon - screenshots of the extension in action*

## 🐛 Known Issues

- Large projects (>1000 files) may take longer to analyze
- Requires active internet connection for diagram generation
- OpenAI API usage costs apply based on your usage

## 📋 Roadmap

- [ ] Support for more diagram types (sequence, class diagrams)
- [ ] Offline diagram generation capabilities  
- [ ] Integration with other AI providers
- [ ] Diagram export functionality (PNG, SVG, PDF)
- [ ] Custom styling and theming options
- [ ] Collaborative diagram sharing

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/mbenachour/vibestack-vscode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mbenachour/vibestack-vscode/discussions)
- **OpenAI API**: [OpenAI Documentation](https://platform.openai.com/docs)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for developers who love to visualize their code architecture.**
