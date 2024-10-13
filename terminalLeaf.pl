:- use_module(library(dom)).
:- dynamic([output_window/1, input_window/1]).

input_window(Input).
output_window(Output).

doggo:-
    write('Bark!'), initTerminalLeaf.

initTerminalLeaf :-
    get_by_class('app-container', Input),
    html(Input, 'lol').

test:-
    output_window(Output),
    html(Output, '<p>lol</p>').

:- doggo.
