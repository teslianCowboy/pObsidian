import { ItemView, WorkspaceLeaf } from 'obsidian';
import 'jquery.terminal';
import 'jquery.terminal/js/jquery.terminal.js';
import 'jquery.terminal/css/jquery.terminal.css';

var $ = require('jquery');
require('jquery.terminal')($);

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

    async onload() {
   }

   initializeTerminal() {
       $(function() {
           $('.pTerminal').terminal(
                  function(command: string) {
                   if (command !== '') {

                   }
       }, {
           greetings: '01234567890123456789012345678901234567890',
           name: 'pObsidian',
           height: 200,
           width: 400,
           prompt: '?- '
       });
        });
   }

    async onOpen() {
    }

    async onClose() {
        // Clean up
    }
}