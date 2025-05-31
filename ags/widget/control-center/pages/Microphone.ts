import { bind } from "astal";
import { Page, PageButton, PageProps } from "./Page";
import { Wireplumber } from "../../../scripts/volume";
import { Astal, Widget } from "astal/gtk3";
import { tr } from "../../../i18n/intl";


export function PageMicrophone(): Page {
    return new Page({
        id: "microphone",
        title: tr("control_center.pages.microphone.title"),
        description: tr("control_center.pages.microphone.description"),
        children: bind(Wireplumber.getWireplumber().get_audio()!, "microphones").as((microphones) => [
            new Widget.Label({
                className: "sub-header",
                label: tr("devices"),
                xalign: 0
            } as Widget.LabelProps),
            ...microphones.map((microphone) =>
                PageButton({
                    className: bind(microphone, "isDefault").as(isDefault => isDefault ? "default" : ""),
                    icon: bind(microphone, "icon").as(icon => 
                        Astal.Icon.lookup_icon(icon) ? icon : "audio-input-microphone-symbolic"),
                    title: bind(microphone, "name").as(name => name ?? "Microphone"),
                    onClick: () => microphone.set_is_default(true),
                    endWidget: new Widget.Icon({
                        icon: "object-select-symbolic",
                        visible: bind(microphone, "isDefault"),
                        css: "font-size: 18px;"
                    } as Widget.IconProps)
                })
            )
        ])
    } as PageProps);
}
