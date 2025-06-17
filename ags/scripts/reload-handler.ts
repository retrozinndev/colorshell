import { execAsync, Gio, monitorFile } from "astal";
import { App } from "astal/gtk3";
import { uwsmIsActive } from "./apps";

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
