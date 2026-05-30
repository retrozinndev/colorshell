import { Gtk } from "ags/gtk4";
import { createBinding } from "ags";
import { omitObjectKeys, variableToBoolean } from "../../../../modules/utils";
import { property, register, signal } from "ags/gobject";
import Pango from "gi://Pango?version=1.0";
import GObject from "gi://GObject?version=2.0";


@register({ GTypeName: "ClshTile" })
class Tile extends Gtk.Box {
    declare $signals: Tile.SignalSignatures;
    declare $readWriteProperties: Tile.ReadWriteProperties;

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

        (this as Tile).emit("toggled", true);
        (this as Tile).emit("enabled");
    }

    public disable(): void {
        if(!this.state) return;

        this.state = false;
        this.remove_css_class("enabled");
        (this as Tile).emit("toggled", false);
        (this as Tile).emit("disabled");
    }

    constructor(props: Partial<GObject.ConstructorProps<Tile>>) {
        super(omitObjectKeys(props, [
            "icon",
            "title",
            "description",
            "state",
            "toggleOnClick",
            "hasArrow"
        ]) as never); // tmp fix

        this.add_css_class("tile");
        this.add_controller(
            <Gtk.GestureClick onReleased={(_, __, px, py) => {
                // gets the icon part of the tile
                const alloc = this.get_first_child()!.compute_bounds(this)[1];
                
                if((px < alloc.get_x() || px > alloc.get_x()+alloc.get_width()) || 
                   (py < alloc.get_y() || alloc.get_y() > py+alloc.get_height())) {

                    (this as Tile).emit("clicked");
                }
            }} /> as Gtk.GestureClick
        );

        if(props.icon === undefined || props.title === undefined)
            throw new Error("One or more of the obligatory properties are unset: \"icon\",\"title\"");

        this.icon = props.icon;
        this.title = props.title;
        this.set_hexpand(true);

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

}

namespace Tile {
    export interface SignalSignatures extends Gtk.Box.SignalSignatures {
        "notify::icon": () => void;
        "notify::title": () => void;
        "notify::description": () => void;
        "notify::toggle-on-click": () => void;
        "notify::state": () => void;
        "notify::has-arrow": () => void;

        "toggled": (state: boolean) => void;
        "enabled": () => void;
        "disabled": () => void;
        "clicked": () => void;
    }

    export interface ReadWriteProperties extends Omit<Gtk.Box.ReadWriteProperties, "orientation"> {
        "title": string;
        "description": string;
        "icon": string;
        "toggle-on-click": boolean;
        "has-arrow": boolean;
        "state": boolean;
    }
}

export default Tile;
