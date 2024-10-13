:- use_module(library(dom)).
:- dynamic([output_window/1, input_window/1]).

input_window(InputWindow).
output_window(OutputWindow).

doggo:-
    write('Bark!'), initTerminalLeaf.

initTerminalLeaf :-
    retract(output_window(_)),
    get_by_class('pTerminal', OutputWindow),
    assert(output_window(OutputWindow)),
    
    html(OutputWindow, 'lol').

test:-
    output_window(Output),
    html(Output, '<p>lol</p>').

:- doggo.