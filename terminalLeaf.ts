import { WorkspaceLeaf, ItemView } from 'obsidian';
import TauPrologPlugin from './main';


export default class TerminalView extends ItemView {

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
    }

    async onClose() {
        // Clean up
    }
}