// obsidian_bridge.ts
export default function tObsidianPredicates(plugin: any) {
    // Get Any folder
    (window as any).getFolder = function(path: string) {
        return plugin.app.vault.getFolderByPath(path);
    };

    // Get contents of folder
    (window as any).getFolderContents = function(folder: any) {
        return folder.children;
    };

    (window as any).tauPrologConsult = async function(path: string) {
        const content = await plugin.app.vault.adapter.read(path);
        return plugin.session.consult(content);
    };

}