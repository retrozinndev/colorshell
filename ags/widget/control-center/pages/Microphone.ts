import { bind } from "astal";
import { Page, PageButton, PageProps } from "./Page";
import AstalWp from "gi://AstalWp?version=0.1";
import { Wireplumber } from "../../../scripts/volume";
import { Astal, Widget } from "astal/gtk3";
import { tr } from "../../../i18n/intl";


export function PageMicrophone(): Page {
    return new Page({
        id: "microphone",
        title: tr("control_center.pages.microphone.title"),
        description: tr("control_center.pages.microphone.description"),
        children: bind(Wireplumber.getWireplumber(), "endpoints").as((endpoints) => [
            new Widget.Label({
                className: "sub-header",
                label: tr("devices"),
                setup: (self) => self.set_alignment(0, .5)
            } as Widget.LabelProps),
            ...endpoints.filter(ep => ep.mediaClass === AstalWp.MediaClass.AUDIO_MICROPHONE).map((ep) =>
                PageButton({
                    className: bind(ep, "isDefault").as(isDefault => isDefault ? "default" : ""),
                    icon: Astal.Icon.lookup_icon(ep.icon) ? ep.icon : "audio-input-microphone-symbolic",
                    title: ep.name ?? "Microphone",
                    onClick: () => ep.set_is_default(true),
                    endWidget: new Widget.Icon({
                        icon: "object-select-symbolic",
                        visible: bind(ep, "isDefault"),
                        css: "font-size: 18px;"
                    } as Widget.IconProps)
                })
            )
        ])
    } as PageProps);
}
