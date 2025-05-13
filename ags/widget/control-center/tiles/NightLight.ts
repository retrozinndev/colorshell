import { bind, Variable } from "astal";
import { Tile, TileProps } from "./Tile";
import { NightLight } from "../../../scripts/nightlight";
import { PageNightLight } from "../pages/NightLight";
import { tr } from "../../../i18n/intl";
import { TilesPages } from "../Tiles";

export const TileNightLight = Tile({
    title: tr("control_center.tiles.night_light.title"),
    icon: "󰖔",
    description: Variable.derive([
        bind(NightLight.getDefault(), "temperature"),
        bind(NightLight.getDefault(), "gamma")
    ], (temp, gamma) => 
        (temp === 6000 ? tr("control_center.tiles.night_light.default_desc") 
            : `${temp}K`) + (gamma < NightLight.getDefault().maxGamma ? 
                ` (${gamma}%)` : "")
    )(),
    iconSize: 16,
    onToggledOff: () => NightLight.getDefault().identity = true,
    onToggledOn: () => NightLight.getDefault().identity = false,
    enableOnClickMore: true,
    onClickMore: () => TilesPages?.toggle(PageNightLight()),
    toggleState: bind(NightLight.getDefault(), "identity").as(identity => !identity)
} as TileProps);
