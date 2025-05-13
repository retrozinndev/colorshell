import { monitorFile, Process } from "astal";
import { App } from "astal/gtk3";

const monitoringPaths = [ "./scripts", "./window", "./app.ts", "env.d.ts" ];

export function restartInstance(instanceName?: string): void {
    Process.exec_async(`astal -q ${ instanceName || App.instanceName || "astal" }`, () => {});
    Process.exec_async(`ags run`, () => {});
}

export function monitorPaths(): void {
    monitoringPaths.map((path: string) => {
        monitorFile(
            path,
            () => restartInstance()
        )
    });
}
