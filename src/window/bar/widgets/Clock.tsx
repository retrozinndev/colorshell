import { Gtk } from "ags/gtk4";
import { Windows } from "../../../windows";
import { createBinding } from "ags";
import { time } from "../../../modules/utils";
import { generalConfig } from "../../../config";


export const Clock = () => 
    <Gtk.Button class={createBinding(Windows.getDefault(), "openWindows").as((wins) =>
        `clock ${wins.includes("center-window") ? "open" : ""}`)}
        onClicked={() => Windows.getDefault().toggle("center-window")}
        label={time((dt) => dt.format(
            generalConfig.getProperty("clock.date_format", "string")) 
                ?? "An error occurred"
        )}
    />;
