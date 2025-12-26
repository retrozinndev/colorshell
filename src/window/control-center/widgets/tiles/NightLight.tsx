import { Tile } from "./Tile";
import { NightLight } from "../../../../modules/nightlight";
import { PageNightLight } from "../pages/NightLight";
import { tr } from "../../../../i18n/intl";
import { TilesPages } from "../tiles";
import { isInstalled } from "../../../../modules/utils";
import { createBinding, createComputed } from "ags";


export const TileNightLight = () => 
    <Tile title={tr("control_center.tiles.night_light.title")}
        icon={"weather-clear-night-symbolic"}
        description={createComputed([
            createBinding(NightLight.getDefault(), "identity"),
            createBinding(NightLight.getDefault(), "temperature"),
            createBinding(NightLight.getDefault(), "gamma")
        ], (identity, temp, gamma) => !identity ? 
                `${temp === NightLight.identityTemperature ? 
                    tr("control_center.tiles.night_light.default_desc") : `${temp}K`
                    } ${gamma < NightLight.maxGamma ? `(${gamma}%)` : ""}`
            : tr("control_center.tiles.disabled")
        )}
        hasArrow visible={isInstalled("hyprsunset")}
        onDisabled={() => NightLight.getDefault().identity = true}
        onEnabled={() => NightLight.getDefault().identity = false}
        onClicked={() => TilesPages?.toggle(PageNightLight)}
        state={createBinding(NightLight.getDefault(), "identity").as(identity => !identity)}
    />
