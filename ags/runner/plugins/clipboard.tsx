import { Gtk } from "ags/gtk4";
import { Clipboard } from "../../scripts/clipboard";
import { ResultWidget } from "../../widget/runner/ResultWidget";
import { Runner } from "../Runner";


export const PluginClipboard = {
    prefix: '>',
    prioritize: true,
    handle: (search) => {
        if(Clipboard.getDefault().history.length < 1) 
            return <ResultWidget icon={"edit-paste-symbolic"} title={"Clipboard is empty"}
                description={"Copy something and it will be shown right here!"}
            />;
        
        return Clipboard.getDefault().history.filter(item => // not the best way to search, but it works
                Runner.regExMatch(search, item.id) || Runner.regExMatch(search, item.preview)).map((item) =>
            <ResultWidget icon={<Gtk.Label label={`${item.id}`} 
              css={"font-size: 16px; margin-right: 8px; font-weight: 600;"} />} 
              title={item.preview} onClick={() => Clipboard.getDefault().selectItem(item).catch((err: Error) => {
                        console.error(`Runner(Plugin/Clipboard): An error occurred while selecting clipboard item. Stderr:\n${
                            err.message ? `${err.message}\n` : ""}Stack: ${err.stack}`
                        );
                    })
                }
            />);
    }
} as Runner.Plugin;
