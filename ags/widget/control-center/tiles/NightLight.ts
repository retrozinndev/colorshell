import { Tile, TileProps } from "./Tile";

export const TileNightLight = Tile({
    title: "Luz Noturna",
    icon: "󰖔",
    iconSize: 16,
    onToggledOff: () => false,
    onToggledOn: () => true,
    toggleState: false
} as TileProps);
