import { Gtk } from "ags/gtk4";
import { createBinding } from "ags";
import { omitObjectKeys, variableToBoolean } from "../../../modules/utils";
import { property, register, signal } from "ags/gobject";
import Pango from "gi://Pango?version=1.0";


export { Tile };


@register({ GTypeName: "Tile" })
class Tile extends Gtk.Box {
    @signal(Boolean) toggled(_state: boolean) {}
    @signal() enabled() {}
    @signal() disabled() {}
    @signal() clicked() {}

    @property(String)
    public icon: string;
    @property(String)
    public title: string;
    @property(String)
    public description: string = "";
    @property(Boolean)
    public enableOnClicked: boolean = true;
    @property(Boolean)
    public state: boolean = false;
    @property(Boolean)
    public hasArrow: boolean = false;
    
    declare $signals: Gtk.Box.SignalSignatures & {
        "toggled": (_state: boolean) => void;
        "enabled": () => void;
        "disabled": () => void;
        "clicked": () => void;
    };

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
        enableOnClicked?: boolean;
        hasArrow?: boolean;
    }) {
        super(omitObjectKeys(props, [
            "icon",
            "title",
            "description",
            "state",
            "enableOnClicked"
        ]));

        this.add_css_class("tile");

        this.icon = props.icon;
        this.title = props.title;
        this.hexpand = true;

        if(props.hasArrow != null)
            this.hasArrow = props.hasArrow;

        if(props.description != null)
            this.description = props.description;

        if(props.state != null)
            this.state = props.state;

        if(props.enableOnClicked != null)
            this.enableOnClicked = props.enableOnClicked;

        if(this.state)
            this.add_css_class("enabled"); // fix no highlight with state = true on construct

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

                <Gtk.GestureClick onReleased={() => {
                    this.emit("clicked");
                    if(this.enableOnClicked && !this.state)
                        this.enable();

                    return true;
                }} />
            </Gtk.Box> as Gtk.Box
        );

        if(this.hasArrow)
            this.append(
                <Gtk.Image class={"arrow"} iconName={"go-next-symbolic"} halign={Gtk.Align.END}>
                    <Gtk.GestureClick onReleased={() => {
                        this.emit("clicked");
                        if(this.enableOnClicked && !this.state)
                            this.enable();

                        return true;
                    }} />
                </Gtk.Image> as Gtk.Image
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
