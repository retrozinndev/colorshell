import { Widget } from "astal/gtk3";
import { Box, Button } from "astal/gtk3/widget";
import AstalHyprland from "gi://AstalHyprland";
import { tr } from "../../i18n/intl";

export function Logo() {
    return new Widget.Box({
        className: "logo",
        //tooltipText: tr("bar.logo.tooltip"),
        child: 
            <Button onClick={ () => AstalHyprland.get_default().dispatch("exec", "anyrun") } label={""} />
    } as Widget.BoxProps);
}
