import { App, Plugin, PluginSettingTab, WorkspaceLeaf,
    ItemView, TFile, Notice, Modal, setIcon, addIcon, MarkdownView} from 'obsidian';

    // before loading tau-prolog, force nodejs_flag to false (core.js: 4787)
    (window as any).process = { browser: true }; 
    if(typeof process !== 'undefined') {
        (process as any).browser = true;
    }

import * as pl from 'tau-prolog';
import TerminalView from './terminalLeaf';
var $ = require('jquery');
require('jquery.terminal')($);
require("tau-prolog/modules/js.js")(pl);
require("tau-prolog/modules/lists.js")(pl);
require("tau-prolog/modules/dom.js")(pl);

import setupPrologEditor from './pObsidianEditor'

interface PobsidianSettings {
    // Add your settings here
}

const DEFAULT_SETTINGS: PobsidianSettings = {
    // Set default values for your settings
}

export default class PobsidianPlugin extends Plugin {
    settings: PobsidianSettings;
    controlLeaf: WorkspaceLeaf | null = null;
    terminalLeaf: WorkspaceLeaf;
    terminalView: TerminalView;
	session: any; // Tau Prolog session
    initTerminal: string = '';
    terminal: any;
    consultedFiles: Set<string> = new Set();
    
    async onload() {
        this.loadSettings();
        this.editorView();

        // Add ribbon icon
        this.addRibbonIcon('sigma', 'pObsidian', async (evt: MouseEvent) => {
			this.initLeaves();
            this.activateView();
        });

        // Register views
        this.registerView('pobsidian-control', (leaf) => new ControlView(leaf, this));
        this.registerView('pobsidian-terminal', (leaf) => {
            this.terminalView = new TerminalView(leaf);
            return this.terminalView;
        });

        // Add settings tab
        this.addSettingTab(new PobsidianSettingTab(this.app, this));

        //Right-click Consult
        this.registerFileMenuEvent();

        // Initialize leaves on startup
        this.app.workspace.onLayoutReady(async () => {
            this.initLeaves();
            this.initProlog();
        });

    }

    async editorView(){
        //this.registerExtensions(['pl'], 'markdown');
        setupPrologEditor(this);
    }

    async editorStyle(){
        // Add custom CSS for Prolog files
    }

    async initProlog(){
    console.log("Initializing Prolog...");

		this.session = pl.create();
		await this.initPrologSession();
	}

	async initPrologSession(){
		try {
			this.initTerminal = await this.readPrologFile('_Framework/terminalLeaf.pl');

			this.session.consult(this.initTerminal, {
			  success: () => {
				console.log("Program loaded successfully.");
                this.createCustomPredicates();
                this.initializeTerminal();
			  },
			  error: (err: any) => { console.log("Error loading initTerminal: " + err) }
			});
		  } catch (error) {
			console.error("Error reading Prolog file:", error);
		  }

	}

    createCustomPredicates() {
        const self = this;
        
        // Add a custom 'echo' function to the global JavaScript context
        (window  as any).tauPrologEcho = function(x: any) {
            if (self.terminal) {
                self.terminal.echo(x.toString());
            }
            return null; // Assuming this should return a Prolog null
        };
    }

    initializeTerminal() {
        const self = this;
        console.log('Initializing terminal...');
        $(function() {
            self.terminal = $('.pTerminal').terminal(
                async function(command: string) {
                    try {
                        await self.handleTerminalInput(command);
                    } catch (e) {
                        self.terminal.error(e instanceof Error ? e.message : String(e));
                    }
                }, {
                    greetings: 'pObsidian Terminal\n \'h\' for help.',
                    name: 'pObsidian',
                    height: 500,
                    prompt: '?- ',
                    keymap: {
                        // Optional: Add Control-C as another way to trigger abort
                        'CTRL+C': async function() {
                            await self.breakCurrentQuery();
                            return false; // Prevent default terminal behavior
                        }
                    }
                }
            );
        });
    }

    private currentQuery: {
        query: string;
        iterator: AsyncGenerator<string, void, unknown> | null;
    } = { query: '', iterator: null };
    
    async handleTerminalInput(input: string): Promise<void> {
        const normalizedInput = input.trim();
        
        switch(true) {
            case normalizedInput === ';':
                await this.findNextSolution();
                break;
            case normalizedInput === 'h':
                this.showHelp();
                break;
            case normalizedInput === '':
                this.terminal.echo("no.");
                break;
            case normalizedInput === '.':
                    await this.breakCurrentQuery();
                    break;
            case normalizedInput === 'a':
                await this.abortAll();
                break;
            case normalizedInput.startsWith('!'):
                // Remove the ! and wrap the rest in a shell_command/1 predicate call
                const command = normalizedInput.substring(1).trim();
                await this.startNewQuery(`frameworkCommand('${command}').`);
                break;
            default:
                await this.startNewQuery(normalizedInput);
        }
    }
    
    private async startNewQuery(query: string): Promise<void> {
        this.currentQuery = {
            query,
            iterator: this.createQueryIterator(query)
        };
        
        await this.findNextSolution();
    }
    
    private async findNextSolution(): Promise<void> {
        if (!this.currentQuery.iterator) {
            this.terminal.echo("?- No current query. Please enter a query first.");
            return;
        }
    
        const result = await this.currentQuery.iterator.next();
        
        if (result.done) {
            this.terminal.echo("no!");
            this.currentQuery.iterator = null;
        } else {
            this.terminal.echo(result.value);
            this.terminal.echo("yes?");
        }
    }
    
    private async* createQueryIterator(query: string): AsyncGenerator<string, void, unknown> {
        try {
            await new Promise<void>((resolve, reject) => {
                this.session.query(query, {
                    success: () => resolve(),
                    error: (err: any) => reject(err)
                });
            });
    
            while (true) {
                const answer = await new Promise((resolve, reject) => {
                    this.session.answer({
                        success: (answer: any) => resolve(answer),
                        fail: () => resolve(null),
                        error: (err: any) => reject(err)
                    });
                });
                
                if (!answer) break;
                yield pl.format_answer(answer);
            }
        } catch (error) {
            this.terminal.error(`Error: ${error}`);
        }
    }
    
    private showHelp(): void {
        this.terminal.echo(`
    Available commands:
        ; - Find next solution
        . - Break query
        a - Abort all queries and restart session
        h - Show this help
    `);
    }

    private async breakCurrentQuery(): Promise<void> {
        if (!this.currentQuery.iterator) {
            this.terminal.echo("?- No query to abort.");
            return;
        }
        
        try {
            // Force the iterator to break
            this.currentQuery.iterator = null;
            
            // Stop the current query in tau-prolog
            this.session.thread.throw(new pl.type.Term("throw", [
                new pl.type.Term("abort", [])
            ]));
            
            this.terminal.echo("% Execution aborted");
            this.terminal.set_prompt("?- ");
        } catch (error) {
            this.terminal.error(`Error during abort: ${error}`);
        }
    }

    private async abortAll(): Promise<void> {
        try {
            // Clear current query
            this.currentQuery = { query: '', iterator: null };
            
            // Reset the Prolog session
            this.refreshPrologSession();
            
            // Clear the terminal
            this.terminal.clear();
            
            // Reset prompt and show abort message
            this.terminal.echo("% All executions aborted");
            this.terminal.echo("% Prolog session restarted");
            this.terminal.set_prompt("?- ");
        } catch (error) {
            this.terminal.error(`Error during abort: ${error}`);
        }
    }
    
    queryProlog(query: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            console.log("Query: " + query);
            const results: string[] = [];
            
            this.session.query(query, {
                success: (goal: any) => {
                    console.log(goal);
                    // Use a recursive function to collect all answers
                    const findAnswer = () => {
                        this.session.answer({
                            success: (answer: any) => {
                                if (answer) {
                                    results.push(pl.format_answer(answer));
                                    findAnswer(); // Look for more answers
                                } else {
                                    resolve(results); // No more answers, resolve with collected results
                                }
                            },
                            fail: () => {
                                resolve(results); // No (more) answers found
                            },
                            error: (err: any) => {
                                reject(err);
                            }
                        });
                    };
                    
                    findAnswer(); // Start looking for answers
                },
                error: (err: any) => {
                    console.log("Error parsing goal: " + err);
                    reject(err);
                }
            });
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    initLeaves() {
        const controlLeaves = this.app.workspace.getLeavesOfType('pobsidian-control');
        this.controlLeaf = controlLeaves[0];

        const terminalLeaves = this.app.workspace.getLeavesOfType('pobsidian-terminal');
        this.terminalLeaf = terminalLeaves[0];
    }

    async ensureLeafCreated(side: 'left' | 'right'): Promise<void> {
        if (side === 'left' && !this.controlLeaf) {
            const leaf = this.app.workspace.getLeftLeaf(false);
            if (leaf) {
                this.controlLeaf = leaf;
                await this.controlLeaf.setViewState({ type: 'pobsidian-control', active: true });
            }
        } else if (side === 'right' && !this.terminalLeaf) {
            const leaf = this.app.workspace.getRightLeaf(false);
            if (leaf) {
                this.terminalLeaf = leaf;
                await this.terminalLeaf.setViewState({ type: 'pobsidian-terminal', active: true });
            }
        }
    }

    async activateView() {
        await this.ensureLeafCreated('left');
        await this.ensureLeafCreated('right');

        if (this.controlLeaf) {
            this.app.workspace.revealLeaf(this.controlLeaf);
        }
        if (this.terminalLeaf) {
            this.app.workspace.revealLeaf(this.terminalLeaf);
        }
    }

	async readPrologFile(filename: string): Promise<string> {
		const adapter = this.app.vault.adapter;
		const exists = await adapter.exists(filename);
		if (exists) {
            const str = await adapter.read(filename)
        //  console.log('File exists: '+str);
		  return str;
		} else {
		  throw new Error(`File not found: ${filename}`);
		}
	  }
    
      registerFileMenuEvent() {
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile && file.extension === 'pl') {
                    menu.addItem((item) => {
                        item
                            .setTitle("Consult Prolog file")
                            .setIcon("sigma")
                            .onClick(async () => {
                                await this.consultPlFileFromVault(file);
                            });
                    });
                }
                  // Add copy path option for all files and folders
            menu.addItem((item) => {
                item
                    .setTitle("Copy path")
                    .setIcon("clipboard-copy")
                    .onClick(() => {
                            navigator.clipboard.writeText(file.path);
                            new Notice(`Copied path: ${file.path}`);
                    });
            });
            })
        );
    }

    async consultPlFileFromVault(file: TFile) {
        try {
            const content = await this.app.vault.read(file);
            this.session.consult(content, {
                success: () => {
                    new Notice(`Successfully consulted ${file.name}`);
                    console.log(`Program ${file.name} loaded successfully.`);
                    if (this.terminal) {
                        this.terminal.echo(`% Consulted ${file.name}`);
                    }
                    this.consultedFiles.add(file.name);
                    this.updateConsultedFilesList();
                },
                error: (err: any) => {
                    new Notice(`Error consulting ${file.name}: ${err}`);
                    console.log(`Error loading program ${file.name}: ${err}`);
                    if (this.terminal) {
                        this.terminal.error(`% Error consulting ${file.name}: ${err}`);
                    }
                }
            });
        } catch (error) {
            new Notice(`Error reading file ${file.name}`);
            console.error(`Error reading Prolog file ${file.name}:`, error);
            if (this.terminal) {
                this.terminal.error(`% Error reading file ${file.name}`);
            }
        }
    }

    updateConsultedFilesList() {
        if (this.terminal) {
            this.terminal.echo("% Consulted files:");
            this.consultedFiles.forEach(fileName => {
                this.terminal.echo(`% - ${fileName}`);
            });
        }
    }

    refreshPrologSession() {
        // Reinitialize the session or perform any necessary cleanup
        this.session = pl.create();
        // Reconsult any base programs if needed
        this.initPrologSession();
    }

    onunload() {
    }
}

class ControlView extends ItemView {
    plugin: PobsidianPlugin;
    container: any;
    consultedSection: any;
    consultedFilesEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: PobsidianPlugin) {
        super(leaf);
        this.plugin = plugin;
		this.containerEl.addClass('pControl');
    }

    getViewType() {
        return 'pobsidian-control';
    }

    getDisplayText() {
        return 'pObsidian Control';
    }

    async onOpen() {
        this.container = this.containerEl.children[1];
        this.container.empty();
        this.container.createEl('h4', { text: 'Pobsidian Control' });

         // Add Reset Session button section
         const resetSection = this.container.createDiv('reset-section');
         resetSection.style.marginBottom = '20px';
         
         const resetButton = resetSection.createEl('button', {
             text: 'Reset Prolog Session',
             cls: 'mod-warning'
         });
         resetButton.style.width = '100%';
         
         resetButton.addEventListener('click', () => {
             new ConfirmationModal(
                 this.app,
                 "Reset Prolog Session",
                 "Are you sure you want to reset the Prolog session? This will clear all consulted files and reset the interpreter state.",
                 () => {
                     this.plugin.refreshPrologSession();
                     this.plugin.consultedFiles.clear();
                     this.updateConsultedFilesList();
                     new Notice("Prolog session has been reset");
                     if (this.plugin?.terminal) {
                         this.plugin.terminal.echo("% Prolog session has been reset");
                     }
                 }
             ).open();
         });
     }

    consultedFileSection(){
        this.consultedSection = this.container.createDiv('consulted-files-section');
        this.consultedSection.createEl('h5', { text: 'Consulted Files' });
        
        // Add a container for the list of consulted files
        const consultedFilesEl = this.consultedSection.createDiv('consulted-files-list');
        
        // Style the container
        consultedFilesEl.style.border = '1px solid var(--background-modifier-border)';
        consultedFilesEl.style.borderRadius = '4px';
        consultedFilesEl.style.padding = '8px';
        consultedFilesEl.style.marginTop = '8px';
        consultedFilesEl.style.maxHeight = '200px';
        consultedFilesEl.style.overflowY = 'auto';

        // Initial update of the list
        this.updateConsultedFilesList();
    }

    updateConsultedFilesList() {
        if (!this.consultedFilesEl) return;
        
        this.consultedFilesEl.empty();
        
        if (this.plugin.consultedFiles.size === 0) {
            const emptyMessage = this.consultedFilesEl.createDiv('empty-message');
            emptyMessage.style.color = 'var(--text-muted)';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '10px';
            emptyMessage.setText('No files consulted yet');
            return;
        }

        // Create a list for the files
        const fileList = this.consultedFilesEl.createEl('ul');
        fileList.style.listStyle = 'none';
        fileList.style.padding = '0';
        fileList.style.margin = '0';

        // Add each consulted file to the list
        this.plugin.consultedFiles.forEach(fileName => {
            const fileItem = fileList.createEl('li');
            fileItem.style.display = 'flex';
            fileItem.style.justifyContent = 'space-between';
            fileItem.style.alignItems = 'center';
            fileItem.style.padding = '4px';
            fileItem.style.marginBottom = '4px';
            fileItem.style.backgroundColor = 'var(--background-secondary)';
            fileItem.style.borderRadius = '3px';

            // Add filename
            const fileNameSpan = fileItem.createSpan();
            fileNameSpan.setText(fileName);

            // Add remove button
            const removeButton = fileItem.createEl('button', { cls: 'clickable-icon' });
            removeButton.style.marginLeft = '8px';
            setIcon(removeButton, 'x');
            removeButton.style.border = 'none';
            removeButton.style.padding = '2px';
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.plugin.consultedFiles.delete(fileName);
                this.updateConsultedFilesList();
                new Notice(`Removed ${fileName} from consulted files`);
            });
        });

        // Add a "Clear All" button if there are files
        if (this.plugin.consultedFiles.size > 0) {
            const clearAllButton = this.consultedFilesEl.createEl('button', {
                text: 'Clear All',
                cls: 'mod-warning'
            });
            clearAllButton.style.marginTop = '8px';
            clearAllButton.style.width = '100%';
            
            clearAllButton.addEventListener('click', () => {
                this.plugin.consultedFiles.clear();
                this.updateConsultedFilesList();
                new Notice('Cleared all consulted files');
                this.plugin.refreshPrologSession();
            });
        }
    }


    async onClose() {
        // Clean up
    }   
}

class ConfirmationModal extends Modal {
    constructor(
        app: App,
        private title: string,
        private message: string,
        private onConfirm: () => void
    ) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;

        contentEl.createEl("h2", { text: this.title });
        contentEl.createEl("p", { text: this.message });

        const buttonContainer = contentEl.createDiv("button-container");
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "10px";
        buttonContainer.style.marginTop = "20px";

        // Cancel button
        const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
        cancelButton.addEventListener("click", () => this.close());

        // Confirm button
        const confirmButton = buttonContainer.createEl("button", {
            text: "Reset",
            cls: "mod-warning"
        });
        confirmButton.addEventListener("click", () => {
            this.onConfirm();
            this.close();
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class PobsidianSettingTab extends PluginSettingTab {
    plugin: PobsidianPlugin;

    constructor(app: App, plugin: PobsidianPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Pobsidian Settings' });
        // Add your settings here
    }
}