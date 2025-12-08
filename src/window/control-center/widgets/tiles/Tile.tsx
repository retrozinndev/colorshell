import { Gtk } from "ags/gtk4";
import { createBinding } from "ags";
import { omitObjectKeys, variableToBoolean } from "../../../../modules/utils";
import { property, register, signal } from "ags/gobject";

import Pango from "gi://Pango?version=1.0";


@register({ GTypeName: "ClshTile" })
export class Tile extends Gtk.Box {
    declare $signals: Gtk.Box.SignalSignatures & {
        "toggled": (state: boolean) => void;
        "enabled": () => void;
        "disabled": () => void;
        "clicked": () => void;
        "notify::icon": () => void;
        "notify::title": () => void;
        "notify::description": () => void;
        "notify::toggle-on-click": () => void;
        "notify::state": () => void;
        "notify::has-arrow": () => void;
    };

    @signal(Boolean) 
    toggled(_: boolean) {}

    @signal() 
    enabled() {}

    @signal() 
    disabled() {}

    @signal() 
    clicked() {
        if(!this.toggleOnClick)
            return;

        this.state ? this.disable() : this.enable();
    }

    @property(String)
    public icon: string;

    @property(String)
    public title: string;

    @property(String)
    public description: string = "";

    @property(Boolean)
    public toggleOnClick: boolean = false;

    @property(Boolean)
    public state: boolean = false;

    @property(Boolean)
    public hasArrow: boolean = false;
   

    public enable(): void {
        if(this.state) return;

        this.state = true;
        !this.has_css_class("enabled") &&
            this.add_css_class("enabled");

        this.emit("toggled", true);
        this.emit("enabled");
    }

    public disable(): void {
        if(!this.state) return;

        this.state = false;
        this.remove_css_class("enabled");
        this.emit("toggled", false);
        this.emit("disabled");
    }

    constructor(props: Partial<Omit<Gtk.Box.ConstructorProps, "orientation">> & {
        icon: string;
        title: string;
        description?: string;
        state?: boolean;
        toggleOnClick?: boolean;
        hasArrow?: boolean;
    }) {
        super(omitObjectKeys(props, [
            "icon",
            "title",
            "description",
            "state",
            "toggleOnClick"
        ]));

        this.add_css_class("tile");
        this.add_controller(
            <Gtk.GestureClick onReleased={(_, __, px, py) => {
                // gets the icon part of the tile
                const { x, y, width, height } = this.get_first_child()!.get_allocation();
                
                if((px < x || px > x+width) || (py < y || y > py+height)) 
                    this.emit("clicked");
            }} /> as Gtk.GestureClick
        );

        this.icon = props.icon;
        this.title = props.title;
        this.hexpand = true;

        if(props.hasArrow !== undefined)
            this.hasArrow = props.hasArrow;

        if(props.description !== undefined)
            this.description = props.description;

        if(props.state !== undefined)
            this.state = props.state;

        if(props.toggleOnClick !== undefined)
            this.toggleOnClick = props.toggleOnClick;

        this.state &&
            this.add_css_class("enabled"); // fix no highlight when enabled on init

        this.prepend(
            <Gtk.Box hexpand={false} vexpand class={"icon"}>
                <Gtk.Image iconName={createBinding(this, "icon")} halign={Gtk.Align.CENTER} />
                <Gtk.GestureClick onReleased={() => {
                    this.state ? this.disable() : this.enable();
                }} />
            </Gtk.Box> as Gtk.Box
        );

        this.append(
            <Gtk.Box class={"content"} orientation={Gtk.Orientation.VERTICAL} vexpand
              valign={Gtk.Align.CENTER} hexpand>

                <Gtk.Label class={"title"} label={createBinding(this, "title")} 
                  xalign={0} ellipsize={Pango.EllipsizeMode.END} hexpand={false} 
                  maxWidthChars={10} />
                <Gtk.Label class={"description"} label={createBinding(this, "description")} 
                  xalign={0} ellipsize={Pango.EllipsizeMode.END} visible={
                      variableToBoolean(createBinding(this, "description"))
                  } maxWidthChars={12} hexpand={false}
                />
            </Gtk.Box> as Gtk.Box
        );

        if(this.hasArrow)
            this.append(
                <Gtk.Image class={"arrow"} iconName={"go-next-symbolic"} 
                  halign={Gtk.Align.END} 
                /> as Gtk.Image
            );
    }

    emit<Signal extends keyof typeof this.$signals>(
        signal: Signal, 
        ...args: Parameters<(typeof this.$signals)[Signal]>
    ): void {
        super.emit(signal, ...args);
    }

    connect<Signal extends keyof typeof this.$signals>(
        signal: Signal, 
        callback: (typeof this.$signals)[Signal]
    ): number {
        return super.connect(signal, callback);
    }
}
