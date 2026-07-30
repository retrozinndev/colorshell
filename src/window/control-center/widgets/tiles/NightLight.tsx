import Tile from "../Tile";
import NightLight from "../../../../modules/nightlight";
import { PageNightLight } from "../pages/NightLight";
import { TilesPages } from "../tiles";
import { createBinding, createComputed } from "ags";


export const TileNightLight = () => 
    <Tile title={tr("control_center.tiles.night_light.title")}
        icon={"weather-clear-night-symbolic"}
        onMap={() => NightLight.getDefault().sync()}
        description={createComputed(() => {
            const identity = createBinding(NightLight.getDefault(), "identity")(),
                temp = createBinding(NightLight.getDefault(), "temperature")(),
                gamma = createBinding(NightLight.getDefault(), "gamma")();

            return !identity ? 
                `${temp === NightLight.identityTemperature ? 
                    tr("control_center.tiles.night_light.default_desc") : `${temp}K`
                    } ${gamma < NightLight.maxGamma ? `(${gamma}%)` : ""}`
            : tr("control_center.tiles.disabled");
        })}
        hasArrow visible={createBinding(NightLight.getDefault(), "available")}
        onDisabled={() => NightLight.getDefault().identity = true}
        onEnabled={() => NightLight.getDefault().identity = false}
        onClicked={() => TilesPages?.toggle(PageNightLight)}
        state={createBinding(NightLight.getDefault(), "identity").as(identity => !identity)}
    />
