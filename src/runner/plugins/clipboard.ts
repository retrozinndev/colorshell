import { Gtk } from "ags/gtk4";
import Clipboard from "../../modules/clipboard";
import Runner from "..";
import { jsx } from "ags/gtk4/jsx-runtime";
import Fuse from "fuse.js";


export class PluginClipboard implements Runner.Plugin {
    #fuse!: Fuse<Clipboard.Item>;
    name = "Clipboard";
    prefix = '>';
    prioritize = true;
    
    init() {
        const items: ReadonlyArray<Clipboard.Item> = [...Clipboard.getDefault().history];
        this.#fuse = new Fuse<Clipboard.Item>(
            items,
            {
                keys: [ "id", "preview" ] satisfies Array<keyof Clipboard.Item>,
                ignoreDiacritics: false,
                isCaseSensitive: false,
                shouldSort: true,
                useExtendedSearch: false
            }
        );
    }

    private clipboardResult(item: Clipboard.Item): Runner.Result {
        return {
            icon: jsx(Gtk.Label, { 
                label: `${item.id}`,
                css: "font-size: 16px; margin-right: 8px; font-weight: 600;"
            }),
            title: item.preview,
            onClicked: () => Clipboard.getDefault().copy(item)
                .catch(console.error)
        };
    }

    async handle(search: string, limit?: number) {
        if(Clipboard.getDefault().history.length < 1) 
            return {
                icon: "edit-paste-symbolic",
                title: "Clipboard is empty",
                description: "Copy something and it will be shown right here!"
            };

        if(search.trim().length === 0)
            return Clipboard.getDefault().history.map(item => 
                this.clipboardResult(item)
            );
        
        return this.#fuse.search(search, {
            limit: limit ?? Infinity
        }).map(result => this.clipboardResult(result.item as Clipboard.Item))
    }
}
