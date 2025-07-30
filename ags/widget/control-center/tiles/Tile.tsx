import { Gtk } from "ags/gtk4";
import { tr } from "../../../i18n/intl";
import { Accessor, createComputed, createState, onCleanup } from "ags";
import { variableToBoolean } from "../../../scripts/utils";

import Pango from "gi://Pango?version=1.0";


export type TileProps = {
    class?: string | Accessor<string>;
    icon?: string | Accessor<string>;
    visible?: boolean | Accessor<boolean>;
    iconSize?: number | Accessor<number>;
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    toggleState?: boolean | Accessor<boolean>;
    enableOnClickMore?: boolean | Accessor<boolean>;
    onUnmap?: (self: Gtk.Box) => void;
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
