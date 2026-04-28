import Cli from ".";
import devel from "./modules/devel";
import main from "./modules/main";
import media from "./modules/media";
import screenshot from "./modules/screenshot";
import volume from "./modules/volume";


const cliModules = [
    main,
    volume,
    media,
    screenshot
] satisfies Array<Cli.Module>;
DEVEL && cliModules.push(devel);

export function initCli(): void {
    Cli.init(undefined, cliModules);
}
