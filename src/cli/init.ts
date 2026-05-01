import Adw from "gi://Adw?version=1";
import Cli from ".";
import devel from "./modules/devel";
import main from "./modules/main";
import media from "./modules/media";
import screenshot from "./modules/screenshot";
import volume from "./modules/volume";
import GAppCli from "./interface/gapp";


let initialized: boolean = false;
const cliModules = [
    main,
    volume,
    media,
    screenshot
] satisfies Array<Cli.Module>;
DEVEL && cliModules.push(devel);

export function initCli(): void {
    if(initialized)
        return;

    Cli.init([
        new GAppCli(Adw.Application.get_default()!)
    ], cliModules);
    initialized = true;
}
