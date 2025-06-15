import { Binding, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { tr } from "../../../i18n/intl";

export type TileProps = {
    className?: string | Binding<string | undefined>;
    icon?: string | Binding<string | undefined>;
    visible?: boolean | Binding<boolean | undefined>;
    iconSize?: number | Binding<number | undefined>;
    title: string | Binding<string | undefined>;
    description?: string | Binding<string | undefined>;
    toggleState?: boolean | Binding<boolean | undefined>;
    enableOnClickMore?: boolean | Binding<boolean | undefined>;
    onDestroy?: () => void;
    onToggledOn: () => void;
    onToggledOff: () => void;
    onClickMore?: () => void;
}

export function Tile(props: TileProps): (() => Gtk.Widget) {
    const subs: Array<() => void> = [];
    const toggled = new Variable<boolean>(((props.toggleState instanceof Binding) ? 
            props.toggleState.get()
        : props.toggleState) ?? false);

    if(props?.toggleState instanceof Binding) 
        subs.push(props.toggleState.subscribe((state) => 
            toggled.set(state ?? false)
        ));

    return () => new Widget.Box({
        className: (props.className instanceof Binding) ? 
            Variable.derive([
                props.className,
                toggled()
            ], (className, isToggled) => 
                `tile ${className} ${isToggled ? "toggled" : ""} ${
                    props.onClickMore ? "has-more" : ""
                }`
            )()
        : toggled().as((state: boolean) => 
            `tile${state ? " toggled" : ""}${
                props.onClickMore ? " has-more" : ""
            }`
        ),
        expand: true,
        visible: props.visible,
        onDestroy: () => {
            subs.map(sub => sub?.());
            props.onDestroy?.();
        },
        children: [
            new Widget.Button({
                className: "toggle-button",
                onClick: () => {
                    if(toggled.get()) {
                        toggled.set(false);
                        props.onToggledOff && props.onToggledOff();
                        return;
                    }

                    toggled.set(true);
                    props.onToggledOn && props.onToggledOn(); 
                },
                child: new Widget.Box({
                    className: "content",
                    expand: true,
                    hexpand: true,
                    children: [
                        new Widget.Icon({
                            className: "icon",
                            icon: props.icon,
                            visible: (props.icon instanceof Binding) ?
                                props.icon.as(Boolean)
                            : Boolean(props.icon),
                            css: `font-size: ${props.iconSize ?? 16}px;`
                        } as Widget.IconProps),
                        new Widget.Box({
                            className: "text",
                            orientation: Gtk.Orientation.VERTICAL,
                            vexpand: true,
                            hexpand: true,
                            valign: Gtk.Align.CENTER,
                            children: [
                                new Widget.Label({
                                    className: "title",
                                    xalign: 0,
                                    halign: Gtk.Align.START,
                                    truncate: true,
                                    label: props.title
                                } as Widget.LabelProps),
                                new Widget.Label({
                                    className: "description",
                                    visible: (props.description instanceof Binding) ?
                                        props.description.as(Boolean)
                                    : Boolean(props.description),
                                    halign: Gtk.Align.START,
                                    truncate: true,
                                    xalign: 0,
                                    label: (props.description instanceof Binding) ?
                                        props.description.as((desc) => desc ? desc : "")
                                    : (props.description || "")
                                } as Widget.LabelProps)
                            ]
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps)
            } as Widget.ButtonProps),
            new Widget.Button({
                className: "more icon",
                visible: props.onClickMore !== undefined,
                halign: Gtk.Align.END,
                tooltipText: tr("control_center.tiles.more") || "More",
                image: new Widget.Icon({
                    icon: "go-next-symbolic",
                    css: "icon { font-size: 16px; }"
                }),
                onClick: () => {
                    ((props.enableOnClickMore instanceof Binding) ? 
                        props.enableOnClickMore.get()
                    : props.enableOnClickMore) && props?.onToggledOn();

                    props.onClickMore && props?.onClickMore()
                },
                widthRequest: 32
            })
        ]
    });
}
