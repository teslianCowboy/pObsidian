import { Plugin, MarkdownView, TAbstractFile, TFile, TFolder, Notice } from 'obsidian';

export default function setupPrologEditor(plugin: Plugin) {
    // Register extensions for .pl files
    plugin.registerExtensions(['pl'], 'markdown');
    
    // Add .pl to the new file menu
    plugin.registerEvent(
        plugin.app.workspace.on('file-menu', (menu, abstractFile: TAbstractFile) => {
            // Show "New Prolog file" option for both files and folders
            if (abstractFile instanceof TFile || abstractFile instanceof TFolder) {
                menu.addItem((item) => {
                    item
                        .setTitle('New Prolog file')
                        .setIcon('file-plus')
                        .onClick(async () => {
                            let path = '';
                            if (abstractFile instanceof TFile && abstractFile.parent) {
                                path = abstractFile.parent.path;
                            } else if (abstractFile instanceof TFolder) {
                                path = abstractFile.path;
                            }
                            
                            const newFileName = 'new-prolog-file.pl';
                            const newFilePath = path ? `${path}/${newFileName}` : newFileName;
                            
                            try {
                                const newFile = await plugin.app.vault.create(newFilePath, '% New Prolog file\n\n');
                                // Open the new file
                                await plugin.app.workspace.getLeaf().setViewState({
                                    type: 'markdown',
                                    state: {
                                        file: newFile.path,
                                        mode: 'source'
                                    }
                                });
                            } catch (err) {
                                new Notice('Error creating Prolog file');
                                console.error(err);
                            }
                        });
                });
            }
        })
    );
    
    // Listen for file opens
    plugin.registerEvent(
        plugin.app.workspace.on('file-open', (file) => {
            if (file?.extension === 'pl') {
                const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    
                }
            }
        })
    );
}

/*
    // Create FontFace instance and load it immediately
    const firaCodeFont = new FontFace('FiraCode', 
        `url('${plugin.app.vault.adapter.getResourcePath(plugin.manifest.dir + '/fonts/FiraCode-Regular.woff2')}') format('woff2')`,
        { weight: 'normal', style: 'normal' }
    );

    // Load font first
    firaCodeFont.load().then(() => {
        (document.fonts as any).add(firaCodeFont);
    });

    // Create base editor extension
    const prologEditorExtension = EditorView.theme({
        "&": {
            "&.pl-file": {
                spellcheck: "false",
                "-webkit-spell-check": "false",
            },
            "&.pl-file .cm-scroller": {
                fontFamily: "'FiraCode', 'Fira Code', ui-monospace, SFMono-Regular, monospace !important",
                fontSize: "14px",
                lineHeight: "1.5",
            },
            "&.pl-file .cm-content": {
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                spellcheck: "false",
                "-webkit-spell-check": "false",
            },
            "&.pl-file .cm-line": {
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                spellcheck: "false",
                "-webkit-spell-check": "false",
            }
        }
    });

    // Register the editor extensions
    plugin.registerEditorExtension([
        prologEditorExtension,
        EditorView.contentAttributes.of({
            spellcheck: 'false',
            'data-spell-check': 'false',
            style: 'spellcheck: false; -webkit-spell-check: false;'
        })
    ]);

    // Create mutation observer to watch for style changes
    const observer = new MutationObserver((mutations) => {
        plugin.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view instanceof MarkdownView && leaf.view.file?.extension === 'pl') {
                const editorEl = (leaf.view.editor as any)?.cm?.dom || 
                               leaf.view.contentEl.querySelector('.cm-editor');
                if (editorEl && !editorEl.classList.contains('pl-file')) {
                    applyPrologStyling(editorEl);
                }
            }
        });
    });

    // Function to apply styling to a specific editor element
    const applyPrologStyling = (editorEl: HTMLElement) => {
        editorEl.classList.add('pl-file');
            
        // Force spellcheck off at the DOM level
        const contentEl = editorEl.querySelector('.cm-content');
        if (contentEl instanceof HTMLElement) {
            contentEl.setAttribute('spellcheck', 'false');
            contentEl.style.setProperty('-webkit-spell-check', 'false', 'important');
            contentEl.style.setProperty('font-family', 
                "'FiraCode', 'Fira Code', ui-monospace, SFMono-Regular, monospace", 
                'important'
            );
        }

        // Force spellcheck off for lines and apply font
        editorEl.querySelectorAll('.cm-line').forEach((line: HTMLElement) => {
            line.setAttribute('spellcheck', 'false');
            line.style.setProperty('-webkit-spell-check', 'false', 'important');
            line.style.setProperty('font-family', 
                "'FiraCode', 'Fira Code', ui-monospace, SFMono-Regular, monospace", 
                'important'
            );
        });

        // Apply to scroller
        const scrollerEl = editorEl.querySelector('.cm-scroller');
        if (scrollerEl instanceof HTMLElement) {
            scrollerEl.style.setProperty('font-family', 
                "'FiraCode', 'Fira Code', ui-monospace, SFMono-Regular, monospace", 
                'important'
            );
        }
    };

    // Start observing the workspace
    observer.observe(plugin.app.workspace.containerEl, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });

    // Function to handle all leaves
    const handleAllLeaves = () => {
        plugin.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view instanceof MarkdownView && leaf.view.file?.extension === 'pl') {
                const editorEl = (leaf.view.editor as any)?.cm?.dom || 
                               leaf.view.contentEl.querySelector('.cm-editor');
                if (editorEl) {
                    applyPrologStyling(editorEl);
                }
            }
        });
    };

    // Register events
    plugin.registerEvent(
        plugin.app.workspace.on('file-open', () => handleAllLeaves())
    );

    plugin.registerEvent(
        plugin.app.workspace.on('layout-change', () => handleAllLeaves())
    );

    plugin.registerEvent(
        plugin.app.workspace.on('active-leaf-change', () => handleAllLeaves())
    );

    // Add cleanup
    plugin.register(() => observer.disconnect());

    // Initial setup
    handleAllLeaves();

    // Set up an interval as a last resort
    const interval = window.setInterval(() => {
        handleAllLeaves();
    }, 1000);

    // Register the interval for cleanup
    plugin.registerInterval(interval);
}*/