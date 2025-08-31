import { Astal, Gtk } from "ags/gtk4";
import { Accessor, createBinding, createState, With } from "ags";
import { Wireplumber } from "../modules/volume";
import { Windows } from "../windows";
import { Backlights } from "../modules/backlight";
import { construct, variableToBoolean } from "../modules/utils";

import GObject, { ParamSpec, property, register } from "ags/gobject";
import Pango from "gi://Pango?version=1.0";
import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "OSDMode" })
export class OSDMode extends GObject.Object {
    readonly #subs: Array<() => void> = [];
    @property(String)
    icon: string = "image-missing";
    @property(Number)
    value: number = 0;
    @property(Number)
    max: number = 100;
    @property(String as unknown as ParamSpec<string|null>)
    text: string|null = null;

    constructor(props: {
        icon: string | Accessor<string>;
        value: number | Accessor<number>;
        max?: number | Accessor<number>;
        text?: string | Accessor<string>;
    }) {
        super();
        this.#subs = construct(this, props);
    }

    vfunc_dispose(): void {
        this.#subs.forEach(s => s());
    }
}

export const OSDModes = {
    SINK: () => new OSDMode({
        icon: createBinding(Wireplumber.getWireplumber().defaultSpeaker, "volumeIcon"),
        value: createBinding(Wireplumber.getWireplumber().defaultSpeaker, "volume"),
        text: createBinding(Wireplumber.getWireplumber().defaultSpeaker, "description"),
        max: Wireplumber.getDefault().getMaxSinkVolume() / 100
    }),
    BRIGHTNESS: () => Backlights.getDefault().available ? new OSDMode({
            icon: "display-brightness-symbolic",
            value: createBinding(Backlights.getDefault().default, "brightness"),
            max: createBinding(Backlights.getDefault().default, "maxBrightness"),
            text: createBinding(Backlights.getDefault().default, "name")
        })
    : new OSDMode({
        icon: "display-brightness-symbolic",
        value: 100,
        max: 100,
        text: "No Backlight found"
    })
}

const [osdMode, setOSDMode] = createState(OSDModes.SINK);
let osdTimer: (GLib.Source|undefined), osdTimeout = 3500;

export const OSD = (mon: number) => 
    <Astal.Window namespace={"osd"} class={"osd-window"} layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM} focusable={false} marginBottom={80} monitor={mon}>

        <Gtk.Box class={"osd"}>
            <With value={osdMode(f => f)}>
                {(_: () => OSDMode) => {
                    const mode = _ as unknown as OSDMode; // for some reason, gnim runs this function :broken_heart:
                    return <Gtk.Box>
                        <Gtk.Image class={"icon"} iconName={
                            createBinding(mode, "icon")
                        } />
                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} class={"level"} vexpand hexpand>
                            <Gtk.Label class={"text"} label={createBinding(mode, "text").as(t => t ?? "")}
                              ellipsize={Pango.EllipsizeMode.END}
                              visible={variableToBoolean(createBinding(mode, "text"))}
                            />
                            <Gtk.LevelBar value={createBinding(mode, "value")} hexpand
                              maxValue={createBinding(mode, "max")}
                            />
                        </Gtk.Box>
                    </Gtk.Box>;
                }}
            </With>
        </Gtk.Box>
    </Astal.Window>;

export function triggerOSD(mode: () => OSDMode) {
    setOSDMode(mode);
    Windows.getDefault().open("osd");

    if(!osdTimer) {
        osdTimer = setTimeout(() => {
            osdTimer = undefined;
            Windows.getDefault().close("osd");
        }, osdTimeout);

        return;
    }

    osdTimer.destroy();
    osdTimer = setTimeout(() => {
        Windows.getDefault().close("osd");
        osdTimer = undefined;
    }, osdTimeout);
}
