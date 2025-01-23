import { monitorFile, Process } from "astal";

const monitoringPaths = [ "./scripts", "./widget", "./app.ts", "env.d.ts" ];

function restartInstance(instanceName?: string) {
    Process.exec_async(`ags run`, () => {});
    Process.exec_async(`astal -q ${ instanceName ? instanceName : "astal" }`, () => {});
}

monitoringPaths.map((path: string) => {
    monitorFile(
        path,
        () => {
            restartInstance("astal");
        }
    )
})
