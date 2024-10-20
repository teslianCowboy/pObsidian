import { ItemView, WorkspaceLeaf } from 'obsidian';
import type PobsidianPlugin from './main';
import 'jquery.terminal';
import 'jquery.terminal/js/jquery.terminal.min.js';
import 'jquery.terminal/css/jquery.terminal.min.css';
import { Stream } from 'node:stream';


export default class TerminalView extends ItemView {
    container = this.containerEl.children[1];
    terminal: any;

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

    createCustomStream() {
        console.log("Initializing Custom Stream...");

        return {
            put: (text: string) => {
                this.terminal.echo(text, { newline: false });
                return true;
            },
            flush: () => {
                // Implement if needed
                return true;
            },
            close: () => {
                // Implement if needed
                return true;
            },
            get: (_length: number, _position: number) => {
                // Not needed for output stream, but required by the Stream interface
                return null;
            },
            eof: () => {
                return true; // Always EOF for output stream
            },
            alias: 'terminal_output',
            type: "text",
            position: 0,
            input: false,
            output: true,
            reposition: false
        };
    }
}