import { App, Plugin, MarkdownView, EditorPosition, KeymapEventHandler, Editor } from 'obsidian';

export default function setupPrologEditor(plugin: Plugin) {
    // Register extensions for .pl files
    plugin.registerExtensions(['pl'], 'markdown');

    // Register event for file open to customize editor
    plugin.registerEvent(
        plugin.app.workspace.on('file-open', (file) => {
            if (!file || file.extension !== 'pl') return;
            
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) return;
            
            const editor = view.editor;
            
            // Add class for styling
            const editorEl = view.containerEl.querySelector('.cm-editor');
            if (editorEl) {
                editorEl.classList.add('pl-file');
                editorEl.classList.add('prolog-editor');
            }

            // Configure editor settings
            configureEditorForProlog(editor, plugin);
        })
    );

    // Handle key events for indentation
    plugin.registerEvent(
        plugin.app.workspace.on('editor-change', (editor: Editor) => {
            const file = plugin.app.workspace.getActiveFile();
            if (!file || file.extension !== 'pl') return;

            handlePrologIndentation(editor);
        })
    );

    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Style for Prolog files */
        .cm-editor.pl-file {
            font-family: var(--font-monospace);
            font-size: 14px;
            line-height: 1.5;
            background-color: var(--code-background);
            padding: 1em;
        }

        .cm-editor.pl-file .cm-line {
            padding-left: 4px;
        }

        .cm-editor.pl-file .cm-gutters {
            border-right: 1px solid var(--background-modifier-border);
            background-color: var(--code-background);
            padding-right: 8px;
        }

        .cm-editor.pl-file .cm-activeLineGutter {
            background-color: var(--background-modifier-hover);
        }
    `;
    document.head.appendChild(styleEl);
    plugin.register(() => styleEl.remove());
}

function configureEditorForProlog(editor: Editor, plugin: Plugin) {
    // Find the editor container through the parent MarkdownView
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    // Register handlers for key events
    plugin.registerDomEvent(view.containerEl, 'keydown', (evt: KeyboardEvent) => {
        if (!(evt.target as HTMLElement).closest('.cm-editor')) return;

        if (evt.key === 'Enter') {
            evt.preventDefault();
            handleEnterKey(editor);
        }
        else if (evt.key === 'Tab') {
            evt.preventDefault();
            handleTabKey(editor);
        }
    });
}

function handleEnterKey(editor: Editor) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line) || '';
    const currentIndent = line.match(/^\s*/)?.[0] || '';
    
    // Get the text content of the current line up to the cursor
    const lineContentBeforeCursor = line.slice(0, cursor.ch);

    // Determine if we need extra indentation
    let newIndent = currentIndent;
    if (lineContentBeforeCursor.trim().endsWith(':-') || 
        lineContentBeforeCursor.trim().endsWith(',')) {
        newIndent += '    ';
    }

    // Insert newline with appropriate indentation
    editor.replaceRange('\n' + newIndent, 
        {line: cursor.line, ch: line.length},
        {line: cursor.line, ch: line.length}
    );

    // Move cursor to end of indentation
    editor.setCursor({line: cursor.line + 1, ch: newIndent.length});
}

function handleTabKey(editor: Editor) {
    const cursor = editor.getCursor();
    const selection = editor.getSelection();

    if (selection) {
        // If there's a selection, indent all selected lines
        const fromPos = editor.getCursor('from');
        const toPos = editor.getCursor('to');
        const text = editor.getRange(fromPos, toPos);

        const lines = text.split('\n');
        const indentedLines = lines.map(line => '    ' + line);
        const newText = indentedLines.join('\n');

        editor.replaceRange(newText, fromPos, toPos);
    } else {
        // No selection, just insert 4 spaces at cursor
        editor.replaceRange('    ', cursor);
    }
}

function handlePrologIndentation(editor: Editor) {
    // Get the cursor position
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line) || '';
    
    // Check if we just added a newline
    if (line === '' && cursor.line > 0) {
        const prevLine = editor.getLine(cursor.line - 1) || '';
        const indent = prevLine.match(/^\s*/)?.[0] || '';
        
        // If previous line ends with :- or , add extra indent
        if (prevLine.trim().endsWith(':-') || prevLine.trim().endsWith(',')) {
            editor.replaceRange(indent + '    ', 
                {line: cursor.line, ch: 0},
                {line: cursor.line, ch: line.length}
            );
        } else {
            editor.replaceRange(indent, 
                {line: cursor.line, ch: 0},
                {line: cursor.line, ch: line.length}
            );
        }
    }
}