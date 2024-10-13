declare module 'tau-prolog' {
    export function create(): Session;
    
    export interface Session {
        consult(program: string, options?: any): void;
        query(query: string, options?: any): void;
        answer(callback: (answer: any) => void): void;
    }

    export namespace type {
        function is_substitution(answer: any): boolean;
    }
    
    export function format_answer(answer: any): string;
}

declare module 'tau-prolog/modules/dom' {
    const dom: any;
    export = dom;
}

declare module 'tau-prolog/modules/promises' {
    function create(session: any): void;
}