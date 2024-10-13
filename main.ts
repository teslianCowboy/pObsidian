import { App, Plugin, PluginSettingTab, WorkspaceLeaf, ItemView, TFile, Notice } from 'obsidian';
import * as pl from 'tau-prolog';
require("tau-prolog/modules/js.js")(pl);
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
    terminalLeaf: WorkspaceLeaf | null = null;
	session: any; // Tau Prolog session

    async onload() {
        this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('sigma', 'pObsidian', (evt: MouseEvent) => {
			this.initLeaves();
            this.activateView();
        });

        // Register views
        this.registerView('pobsidian-control', (leaf) => new ControlView(leaf));
        this.registerView('pobsidian-terminal', (leaf) => new TerminalView(leaf));

        // Add settings tab
        this.addSettingTab(new PobsidianSettingTab(this.app, this));

        // Initialize leaves on startup
        this.app.workspace.onLayoutReady(async () => {
            this.initLeaves();
            this.initProlog();

        });

    }

   async initProlog(){
		this.session = pl.create();
		await this.initPrologSession();
	}

	async initPrologSession(){
		try {
			const pluginDir = this.manifest.dir ?? '';
			if (!pluginDir) {
			  throw new Error("Plugin directory is undefined");
			}

			const program =   `
			:- use_module(library(dom)).

            initTerminalLeaf :-
                get_by_class('pTerminal', Input),
                html(Input, '<p>lol<p>').

			`;

            const program2 = await this.readPrologFile(pluginDir + '/terminalLeaf.pl');

			this.session.consult(program2, {
			  success: () => {
				console.log("Program loaded successfully:\n" + program2);
                this.queryProlog('initTerminalLeaf.');
			  },
			  error: (err: any) => { console.log("Error loading program: " + err + " " + program2) }
			});
		  } catch (error) {
			console.error("Error reading Prolog file:", error);
		  }

	}

	queryProlog(query: string) {
		console.log("Query: " + query);
		this.session.query(query, {
		  success: (_goal: any) => {
			console.log("Ruff!");
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
        this.controlLeaf = controlLeaves.length > 0 ? controlLeaves[0] : null;

        const terminalLeaves = this.app.workspace.getLeavesOfType('pobsidian-terminal');
        this.terminalLeaf = terminalLeaves.length > 0 ? terminalLeaves[0] : null;
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

class TerminalView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
		this.containerEl.addClass('pTerminal');
    }

    getViewType() {
        return 'pobsidian-terminal';
    }

    getDisplayText() {
        return 'Pobsidian Terminal';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h4', { text: 'Pobsidian Terminal' });
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