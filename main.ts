import { App, Plugin, PluginSettingTab, WorkspaceLeaf, ItemView, TFile, Notice } from 'obsidian';
import * as pl from 'tau-prolog';
import TerminalView from './terminalLeaf';
import { Stream } from 'node:stream';
var $ = require('jquery');
require('jquery.terminal')($);
require("tau-prolog/modules/js.js")(pl);
require("tau-prolog/modules/lists.js")(pl);
require("tau-prolog/modules/dom.js")(pl);

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
    program2: string = '';
    terminal: any;
    customStream: any; 

    async onload() {
        this.loadSettings();


        // Add ribbon icon
        this.addRibbonIcon('sigma', 'pObsidian', async (evt: MouseEvent) => {
			this.initLeaves();
            this.activateView();
        });

        // Register views
        this.registerView('pobsidian-control', (leaf) => new ControlView(leaf));
        this.registerView('pobsidian-terminal', (leaf) => {
            this.terminalView = new TerminalView(leaf);
            return this.terminalView;
        });

        // Add settings tab
        this.addSettingTab(new PobsidianSettingTab(this.app, this));

        // Initialize leaves on startup
        this.app.workspace.onLayoutReady(async () => {
            this.initLeaves();
            this.initProlog();
        });

    }

    getCustomStream() {
        this.customStream = this.terminalView.createCustomStream();
        console.log("Custom stream created:", this.customStream);
        this.session.streams['terminal_output'] = this.customStream;
        console.log(this.session.streams);
    }

   async initProlog(){
    console.log("Initializing Prolog...");
		this.session = pl.create();
        this.getCustomStream();
		await this.initPrologSession();
	}

	async initPrologSession(){
		try {
			this.program2 = await this.readPrologFile('/terminalLeaf.pl');

			this.session.consult(this.program2, {
			  success: () => {
				console.log("Program loaded successfully.");
                this.createCustomPredicates(); // Add this line

                this.session.query("setup_custom_stream.");
                this.initializeTerminal();
			  },
			  error: (err: any) => { console.log("Error loading program: " + err + " " + this.program2) }
			});
		  } catch (error) {
			console.error("Error reading Prolog file:", error);
		  }

	}

    createCustomPredicates() {
        const self = this;
        
        // Add a custom 'echo' function to the global JavaScript context
        (global as any).tauPrologEcho = function(x: any) {
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
                function(command: string) {
                    try {
                        let result = self.queryProlog(command);
                        self.terminal.echo(result);
                    } catch (e) {
                        self.terminal.error(e instanceof Error ? e.message : String(e));
                    }
                }, {
                    greetings: 'pObsidian Terminal',
                    name: 'pObsidian',
                    height: 500,
                    prompt: '?- '
                }
            );
        });
    }

	async queryProlog(query: string) {
		console.log("Query: " + query);
		this.session.query(query, {
		  success: (goal: any) => {
			console.log(goal);
			this.session.answer((answer: any) => {
			  console.log("Answer: " + pl.format_answer(answer));
			});
		  },
		  error: (err: any) => { console.log("Error parsing goal: " + err) }
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

    onunload() {
        // Clean up leaves if needed
    }
}

class ControlView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
		this.containerEl.addClass('pControl');
    }

    getViewType() {
        return 'pobsidian-control';
    }

    getDisplayText() {
        return 'pObsidian Control';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h4', { text: 'Pobsidian Control' });
    }

    async onClose() {
        // Clean up
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