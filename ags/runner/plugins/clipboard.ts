import { Widget } from "astal/gtk3";
import { Clipboard } from "../../scripts/clipboard";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import { Runner } from "../Runner";
import { Gio } from "astal";


export const PluginClipboard = {
    prefix: '>',
    prioritize: true,
    handle: (search) => {
        if(Clipboard.getDefault().history.length < 1) 
            return new ResultWidget({
                icon: "edit-paste-symbolic",
                title: "Clipboard is empty",
                description: "Copy something and it will be shown right here!"
            } as ResultWidgetProps);
        
        return Clipboard.getDefault().history.filter(item => // not the best way to search, but it works
                Runner.regExMatch(search, item.id) || Runner.regExMatch(search, item.preview)).map((item) =>
            new ResultWidget({
                icon: new Widget.Label({
                    label: item.id.toString(),
                    css: "font-size: 16px; margin-right: 8px; font-weight: 600;"
                } as Widget.LabelProps),
                title: item.preview,
                onClick: () => Clipboard.getDefault().selectItem(item).catch((err: Gio.IOErrorEnum) => {
                    console.error(`Runner(Plugin/Clipboard): An error occurred while selecting clipboard item. Stderr:\n${
                        err.message ? `${err.message}\n` : ""}Stack: ${err.stack}`);
                })
            } as ResultWidgetProps));
    }
} as Runner.Plugin;
