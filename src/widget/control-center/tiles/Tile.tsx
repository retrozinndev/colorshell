import { Gtk } from "ags/gtk4";
import { tr } from "../../../i18n/intl";
import { Accessor, createBinding, createComputed, createState, getScope, onCleanup } from "ags";
import { omitObjectKeys, variableToBoolean } from "../../../modules/utils";
import GObject, { property, register, signal } from "ags/gobject";

import Pango from "gi://Pango?version=1.0";


export { Tile, TileProps };

type TileProps = {
    class?: string | Accessor<string>;
    icon?: string | Accessor<string>;
    visible?: boolean | Accessor<boolean>;
    iconSize?: number | Accessor<number>;
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    toggleState?: boolean | Accessor<boolean>;
    enableOnClickMore?: boolean | Accessor<boolean>;
    onUnmap?: () => void;
    onToggledOn: () => void;
    onToggledOff: () => void;
    onClickMore?: () => void;
};

/* TODO: finish the tile class
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
    
    declare $signals: Gtk.Box.SignalSignatures & {
        "toggled": (_state: boolean) => void;
        "enabled": () => void;
        "disabled": () => void;
        "clicked": () => void;
    };

    public enable(): void {
        if(this.state) return;

        this.emit("toggled", true);
        this.emit("enabled");
        this.state = true;
    }

    public disable(): void {
        if(!this.state) return;

        this.emit("toggled", false);
        this.emit("disabled");
        this.state = false;
    }

    constructor(props: Omit<Gtk.Box.ConstructorProps, "orientation"> & {
        icon: string;
        title: string;
        description?: string;
        state?: boolean;
        enableOnClicked?: boolean;
    }) {
        super(omitObjectKeys(props, [
            "icon",
            "title",
            "description",
            "state",
            "enableOnClicked"
        ]));
        
        this.icon = props.icon;
        this.title = props.title;

        if(props.description != null)
            this.description = props.description;

        if(props.state != null)
            this.state = props.state;

        if(props.enableOnClicked != null)
            this.enableOnClicked = props.enableOnClicked;

        const connections = new Map<GObject.Object, number>();
        const gestureClick = Gtk.GestureClick.new();

        this.add_controller(gestureClick);

        connections.set(gestureClick, gestureClick.connect("released", () => {
            this.emit("clicked");
            if(this.enableOnClicked && !this.state)
                this.enable();
            return true;
        }));

        this.prepend(
            <Gtk.Box hexpand={false} vexpand>
                <Gtk.Image iconName={createBinding(this, "icon")} />
            </Gtk.Box> as Gtk.Box
        );

        this.append(
            <Gtk.Box class={"content"} orientation={Gtk.Orientation.VERTICAL}>
                <Gtk.Label class={"title"} label={createBinding(this, "title")} />
                <Gtk.Label class={"description"} label={createBinding(this, "description")} />
            </Gtk.Box> as Gtk.Box
        );

        getScope()?.onCleanup(() => connections.forEach((id, obj) => obj.disconnect(id)));
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
*/

function Tile(props: TileProps): Gtk.Widget {
    const subs: Array<() => void> = [];
    const [toggled, setToggled] = createState(((props.toggleState instanceof Accessor) ? 
            props.toggleState.get()
        : props.toggleState) ?? false);


    (props.toggleState instanceof Accessor) && subs.push(
        props.toggleState.subscribe(() => 
            setToggled((props.toggleState as Accessor<boolean>).get() ?? false))
    );

    onCleanup(() => subs.forEach(s => s()));

    return <Gtk.Box hexpand visible={props.visible} onUnmap={props.onUnmap} 
      canFocus focusable={false} class={
        (props.class instanceof Accessor) ?
          createComputed([props.class, toggled], (clss, isToggled) => 
              `tile ${clss} ${isToggled ? "toggled" : ""} ${
                  props.onClickMore ? "has-more" : ""
              }`
          )
        : toggled.as(isToggled => 
            `tile ${props.class ? props.class : ""} ${isToggled ? "toggled" : ""} ${
                props.onClickMore ? "has-more" : ""
            }`
        )
      }>
        <Gtk.Button class={"toggle-button"} onClicked={() => {
            if(toggled.get()) {
                setToggled(false);
                props.onToggledOff?.();
                return;
            }

            setToggled(true);
            props.onToggledOn?.();
        }}>

            <Gtk.Box class={"content"} hexpand={true} vexpand={true}>
                {props.icon && <Gtk.Image class={"icon"} iconName={props.icon} css={
                    (props.iconSize instanceof Accessor) ?
                        props.iconSize.as(size => `font-size: ${size}px;`)
                    : (props.iconSize ? 
                       `font-size: ${props.iconSize ?? 16}px;`
                      : undefined)
                } />}

                <Gtk.Box orientation={Gtk.Orientation.VERTICAL} class={"text"} vexpand={true} hexpand={true}
                  valign={Gtk.Align.CENTER}>

                    <Gtk.Label class={"title"} xalign={0} halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END}
                      label={props.title} />

                    {props.description && <Gtk.Label class={"description"} ellipsize={Pango.EllipsizeMode.END}
                        visible={variableToBoolean(props.description)} xalign={0} label={
                            (props.description instanceof Accessor) ?
                                props.description.as(str => str ?? "")
                            : (props.description ?? "")
                        } halign={Gtk.Align.START}
                    />}

                </Gtk.Box>
            </Gtk.Box>
        </Gtk.Button>

        <Gtk.Button class={"more icon"} iconName={"go-next-symbolic"} widthRequest={32} 
          visible={Boolean(props.onClickMore)} halign={Gtk.Align.END} onClicked={() => {
              ((props.enableOnClickMore instanceof Accessor) ?
                  props.enableOnClickMore.get()
              : props.enableOnClickMore) && props.onToggledOn?.();

              props.onClickMore?.();
          }} tooltipText={tr("control_center.tiles.more")} />
    </Gtk.Box> as Gtk.Widget;
}
