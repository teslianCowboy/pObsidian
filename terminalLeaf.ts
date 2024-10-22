import { ItemView, WorkspaceLeaf } from 'obsidian';
import 'jquery.terminal';
import 'jquery.terminal/js/jquery.terminal.min.js';
import 'jquery.terminal/css/jquery.terminal.min.css';


export default class TerminalView extends ItemView {
    container = this.containerEl.children[1];

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

}