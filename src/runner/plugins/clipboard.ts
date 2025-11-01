import { Gtk } from "ags/gtk4";
import { Clipboard, ClipboardItem } from "../../modules/clipboard";
import { Runner } from "../Runner";
import { jsx } from "ags/gtk4/jsx-runtime";

import Fuse from "fuse.js";


class _PluginClipboard implements Runner.Plugin {
    #fuse!: Fuse<unknown>;
    prefix = '>';
    prioritize = true;
    
    init() {
        const items: ReadonlyArray<ClipboardItem> = [...Clipboard.getDefault().history];
        this.#fuse = new Fuse(
            items,
            {
                keys: [ "id", "preview" ] satisfies Array<keyof ClipboardItem>,
                ignoreDiacritics: false,
                isCaseSensitive: false,
                shouldSort: true,
                useExtendedSearch: false
            }
        );
    }

    private clipboardResult(item: ClipboardItem): Runner.Result {
        return {
            icon: jsx(Gtk.Label, { 
                label: `${item.id}`,
                css: "font-size: 16px; margin-right: 8px; font-weight: 600;"
            }),
            title: item.preview,
            actionClick: () => Clipboard.getDefault().selectItem(item).catch((err: Error) => {
                console.error(`Runner(Plugin/Clipboard): An error occurred while selecting clipboard item. Stderr:\n${
                    err.message ? `${err.message}\n` : ""}Stack: ${err.stack}`
                );
            })
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
        }).map(result => this.clipboardResult(result.item as ClipboardItem))
    }
}

export const PluginClipboard = new _PluginClipboard();
