import { uwsmIsActive } from "./apps";

import Gio from "gi://Gio?version=2.0";
import { Shell } from "../app";


export function restartInstance(): void {
    Gio.Subprocess.new(
        ( uwsmIsActive ? 
            [ "uwsm", "app", "--", "colorshell" ]
         : [ "colorshell" ]), 
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );
    Shell.getDefault().quit();
}
