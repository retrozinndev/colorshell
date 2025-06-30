import { monitorFile } from "ags/file";
import { execAsync } from "ags/process";
import { uwsmIsActive } from "./apps";

import App from "ags/gtk4/app";
import Gio from "gi://Gio?version=2.0";


const monitoringPaths = [ "./scripts", "./window", "./app.ts", "env.d.ts" ];

export function restartInstance(instanceName?: string): void {
    execAsync(`astal -q ${ instanceName ?? App.instanceName ?? "astal" }`);
    Gio.Subprocess.new(
        ( uwsmIsActive ? 
            [ "uwsm", "app", "--", "ags", "run" ]
         : [ "ags", "run" ]), 
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );
}

export function monitorPaths(): void {
    monitoringPaths.map((path: string) => {
        monitorFile(
            path,
            () => restartInstance()
        )
    });
}
