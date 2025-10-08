import * as fs from 'fs';
import * as path from 'path';

export interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
}

// Directories and file patterns to skip
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'out', 'dist', 'build', '.vscode-test',
    'vendor', 'coverage', '.next', '.nuxt', '__pycache__',
    'venv', 'env', '.venv', 'target', 'bin', 'obj'
]);

const SKIP_PATTERNS = [
    /\.min\.js$/, /\.map$/, /\.lock$/, /package-lock\.json$/,
    /yarn\.lock$/, /\.log$/, /\.cache/, /\.DS_Store$/
];

function shouldSkip(name: string, isDirectory: boolean): boolean {
    if (isDirectory && SKIP_DIRS.has(name)) {
        return true;
    }
    return SKIP_PATTERNS.some(pattern => pattern.test(name));
}

export function getFileTree(dirPath: string, maxDepth: number = 4, currentDepth: number = 0): FileNode | null {
    if (currentDepth >= maxDepth) {
        return null;
    }

    const stat = fs.statSync(dirPath);
    const node: FileNode = {
        name: path.basename(dirPath),
        path: dirPath,
        isDirectory: stat.isDirectory()
    };

    if (stat.isDirectory()) {
        node.children = [];
        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
            // Skip unnecessary files and directories
            if (shouldSkip(entry, false)) {
                continue;
            }

            const fullPath = path.join(dirPath, entry);
            try {
                const childStat = fs.statSync(fullPath);
                if (shouldSkip(entry, childStat.isDirectory())) {
                    continue;
                }

                const childNode = getFileTree(fullPath, maxDepth, currentDepth + 1);
                if (childNode) {
                    node.children.push(childNode);
                }
            } catch (err) {
                // Skip files that can't be accessed
                continue;
            }
        }

        // Sort children: directories first, then files
        node.children.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });
    }

    return node;
}

export function fileTreeToString(node: FileNode | null, indent: string = '', isLast: boolean = true): string {
    if (!node) {
        return '';
    }

    let result = '';
    const prefix = isLast ? '└── ' : '├── ';
    result += indent + prefix + node.name + '\n';

    if (node.children && node.children.length > 0) {
        const newIndent = indent + (isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
            const isLastChild = index === node.children!.length - 1;
            result += fileTreeToString(child, newIndent, isLastChild);
        });
    }

    return result;
}

export function findReadmeFiles(rootPath: string): string[] {
    const readmeFiles: string[] = [];
    const readmePattern = /^readme(\.md|\.txt)?$/i;

    function searchDirectory(dirPath: string, depth: number = 0) {
        if (depth > 3) return; // Only search up to 3 levels deep

        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
            if (entry === 'node_modules' || entry === '.git' || entry === 'out' || entry === 'dist') {
                continue;
            }

            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isFile() && readmePattern.test(entry)) {
                readmeFiles.push(fullPath);
            } else if (stat.isDirectory()) {
                searchDirectory(fullPath, depth + 1);
            }
        }
    }

    searchDirectory(rootPath);
    return readmeFiles;
}

export function readReadmeContent(readmeFiles: string[], maxLength: number = 10000): string {
    let content = '';

    // Prioritize main README
    const mainReadme = readmeFiles.find(f => f.toLowerCase().endsWith('readme.md') && !f.includes('/'));
    const filesToRead = mainReadme ? [mainReadme] : readmeFiles.slice(0, 2);

    for (const filePath of filesToRead) {
        try {
            let fileContent = fs.readFileSync(filePath, 'utf-8');

            // Truncate if too long
            if (fileContent.length > maxLength) {
                fileContent = fileContent.substring(0, maxLength) + '\n... (truncated)';
            }

            const relativePath = path.relative(process.cwd(), filePath);
            content += `\n--- ${relativePath} ---\n${fileContent}\n`;
        } catch (err) {
            // Skip files that can't be read
            continue;
        }
    }

    return content || 'No README files found.';
}
