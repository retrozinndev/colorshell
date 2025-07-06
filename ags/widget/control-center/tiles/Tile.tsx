import { Gdk, Gtk } from "ags/gtk4";
import { tr } from "../../../i18n/intl";
import { Accessor, createComputed, createState } from "ags";
import GObject from "gi://GObject?version=2.0";
import Pango from "gi://Pango?version=1.0";
import { variableToBoolean } from "../../../scripts/utils";

export type TileProps = {
    class?: string | Accessor<string>;
    icon?: string | Accessor<string>;
    visible?: boolean | Accessor<boolean>;
    iconSize?: number | Accessor<number>;
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    toggleState?: boolean | Accessor<boolean>;
    enableOnClickMore?: boolean | Accessor<boolean>;
    onDestroy?: () => void;
    onToggledOn: () => void;
    onToggledOff: () => void;
    onClickMore?: () => void;
}

export function Tile(props: TileProps): Gtk.Widget {
    const subs: Array<() => void> = [];
    const [toggled, setToggled] = createState(((props.toggleState instanceof Accessor) ? 
            props.toggleState.get()
        : props.toggleState) ?? false);


    (props.toggleState instanceof Accessor) && subs.push(
        props.toggleState.subscribe(() => 
            setToggled((props.toggleState as Accessor<boolean>).get() ?? false))
    );

    return <Gtk.Box class={
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
    } hexpand={true} visible={props.visible} onDestroy={(_) => {
        subs.forEach(sub => sub());
        props.onDestroy?.();
    }}>

        <Gtk.Button class={"toggle-button"} $={(self) => {
            const gestureClick = Gtk.GestureClick.new();
            const conns: Map<GObject.Object, number> = new Map();

            self.add_controller(gestureClick);

            conns.set(gestureClick, gestureClick.connect("released", (gesture) => {
                if(gesture.get_current_button() === Gdk.BUTTON_PRIMARY) {
                    if(toggled.get()) {
                        setToggled(false);
                        props.onToggledOff?.();
                        return;
                    }

                    setToggled(true);
                    props.onToggledOn?.();
                }
            }));
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
