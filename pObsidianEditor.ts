import { Plugin, MarkdownView, Editor } from 'obsidian';
import { EditorView } from '@codemirror/view';

export default function setupPrologEditor(plugin: Plugin) {
    // Register extensions for .pl files
    plugin.registerExtensions(['pl'], 'markdown');

    // Define font CSS
    const fontCSS = `
        @font-face {
            font-family: 'FiraCode';
            src: url('${plugin.app.vault.adapter.getResourcePath(plugin.manifest.dir + '/fonts/FiraCode-Regular.woff2')}') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }
    `;

    // Add font-face CSS to document
    const styleElement = document.createElement('style');
    styleElement.textContent = fontCSS;
    document.head.appendChild(styleElement);

    // Load font before applying styles
    const fontFace = new FontFace('FiraCode', 
        `url('${plugin.app.vault.adapter.getResourcePath(plugin.manifest.dir + '/fonts/FiraCode-Regular.woff2')}') format('woff2')`
    );

    fontFace.load().then(() => {
        (document.fonts as any).add(fontFace);

        // Add custom CSS using EditorView theming
        const customStyle = EditorView.baseTheme({
            "&.cm-editor.pl-file .cm-scroller": {
                fontFamily: '"FiraCode", "Fira Code", ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace !important',
                fontSize: '14px',
                lineHeight: '1.5'
            },
            "&.cm-editor.pl-file .cm-content": {
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit'
            }
        });

        // Register the extension
        plugin.registerEditorExtension(customStyle);
    }).catch(err => {
        console.error('Failed to load FiraCode font:', err);
        
        // Fallback style without FiraCode
        const fallbackStyle = EditorView.baseTheme({
            "&.cm-editor.pl-file .cm-content": {
                fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
                fontSize: '14px',
                lineHeight: '1.5'
            }
        });
        plugin.registerEditorExtension(fallbackStyle);
    });

    // Add class to editor when opening .pl files
    plugin.registerEvent(
        plugin.app.workspace.on('file-open', (file) => {
            if (!file) return;
            
            const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) return;

            const editor = activeView.editor;
            if (!editor) return;

            // Get editor DOM element
            const editorEl = (editor as any).cm?.dom || activeView.contentEl.querySelector('.cm-editor');
            if (!editorEl) return;
            
            // Remove class if exists
            editorEl.classList.remove('pl-file');
            
            // Add class if it's a .pl file
            if (file.extension === 'pl') {
                editorEl.classList.add('pl-file');
            }
        })
    );
}