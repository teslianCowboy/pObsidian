:- use_module(library(dom)).
:- dynamic([output_window/1, input_window/1]).

input_window(Input).
output_window(Output).

doggo:-
    write('Bark!'), initTerminalLeaf.

initTerminalLeaf :-
    get_by_class('prolog-input', Input).

test:-
    output_window(Output),
    html(Output, '<p>lol</p>').