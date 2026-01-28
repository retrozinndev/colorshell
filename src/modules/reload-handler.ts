import { execApp } from "./apps";
import { Shell } from "../app";


export function restartInstance(): void {
    execApp("colorshell");
    Shell.getDefault().quit();
}
