import { Tile } from "./Tile";
import { NightLight } from "../../../scripts/nightlight";
import { PageNightLight } from "../pages/NightLight";
import { tr } from "../../../i18n/intl";
import { TilesPages } from "../Tiles";
import { isInstalled } from "../../../scripts/utils";
import { createBinding, createComputed } from "ags";

export const TileNightLight = () => 
    <Tile title={tr("control_center.tiles.night_light.title")}
        icon={"weather-clear-night-symbolic"}
        description={createComputed([
            createBinding(NightLight.getDefault(), "temperature"),
            createBinding(NightLight.getDefault(), "gamma")
        ], (temp, gamma) => `${temp === NightLight.getDefault().identityTemperature ? 
                tr("control_center.tiles.night_light.default_desc") : `${temp}K`} ${
            gamma < NightLight.getDefault().maxGamma ? `(${gamma}%)` : ""}`
        )}
        visible={isInstalled("hyprsunset")}
        onToggledOff={() => NightLight.getDefault().identity = true}
        onToggledOn={() => NightLight.getDefault().identity = false}
        enableOnClickMore={true}
        onClickMore={() => TilesPages?.toggle(PageNightLight())}
        toggleState={createBinding(NightLight.getDefault(), "identity").as(identity => !identity)}
    />
