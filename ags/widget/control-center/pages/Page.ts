import { Binding, register } from "astal";
import { Gtk, Widget } from "astal/gtk3";

export type PageProps = {
    setup?: () => void;
    onClose?: () => void;
    onOpen?: () => void;
    id: string;
    className?: string | Binding<string>;
    title: string | Binding<string>;
    description?: string | Binding<string>;
    headerButtons?: Array<Gtk.Button> | Binding<Array<Gtk.Button>>;
    orientation?: Gtk.Orientation | Binding<Gtk.Orientation>;
    spacing?: number;
    child?: Gtk.Widget | Binding<Gtk.Widget>;
    children?: Array<Gtk.Widget> | Binding<Array<Gtk.Widget>>;
};

export { Page };

@register({ GTypeName: "Page" })
class Page extends Widget.Box {
    readonly #id: string;
    #title: string | Binding<string>;
    #description: string | undefined | Binding<string>;

    public get title() { return this.#title; }
    public get description() { return this.#description; }
    public get id() { return this.#id; }

    constructor(props: PageProps) {
        super({
            hexpand: true,
            orientation: Gtk.Orientation.VERTICAL,
            className: (props.className instanceof Binding) ? 
                props.className.as((clsName) => `page ${ clsName ?? "" }`)
            : `page ${props.className ?? ""}`,
            children: [
                new Widget.Box({
                    className: "header",
                    orientation: Gtk.Orientation.VERTICAL,
                    hexpand: true,
                    children: [
                        new Widget.Box({
                            className: "top",
                            children: [
                                new Widget.Label({
                                    hexpand: true,
                                    className: "title",
                                    truncate: true,
                                    visible: (props.title instanceof Binding) ? 
                                        props.title.as(Boolean) 
                                    : (props.title ? true : false),
                                    label: props.title,
                                    halign: Gtk.Align.START
                                } as Widget.LabelProps),
                                new Widget.Box({
                                    className: "button-row",
                                    visible: (props.headerButtons instanceof Binding) ? 
                                        props.headerButtons.as(Boolean) 
                                    : (props.headerButtons ? true : false),
                                    children: props.headerButtons
                                } as Widget.BoxProps)
                            ]
                        } as Widget.BoxProps),
                        new Widget.Label({
                            className: "description",
                            hexpand: true,
                            truncate: true,
                            xalign: 0,
                            visible: (props.description instanceof Binding) ? 
                                props.description.as(Boolean) 
                            : props.description ? true : false,
                            label: props.description
                        } as Widget.LabelProps),
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "content",
                    spacing: props.spacing ?? 4,
                    orientation: props.orientation ?? Gtk.Orientation.VERTICAL,
                    expand: true,
                    setup: props.setup,
                    child: props.child,
                    children: props.children
                } as Widget.BoxProps)
            ]
        });

        this.#id = props.id;
        this.#title = props.title;
        this.#description = props.description;
    }
}

export function PageButton(props: {
    className?: string | Binding<string>;
    icon?: string | Binding<string>;
    title: string | Binding<string>;
    endWidget?: Gtk.Widget | Binding<Gtk.Widget>;
    extraButtons?: Array<Widget.Button> | Binding<Array<Gtk.Widget>>;
    onClick?: (self: Widget.Button) => void;
}): Gtk.Widget {
    return new Widget.Box({
        children: [
            new Widget.Button({
                onClick: props.onClick,
                className: props.className,
                hexpand: true,
                child: new Widget.Box({
                    className: "page-button",
                    orientation: Gtk.Orientation.HORIZONTAL,
                    expand: true,
                    children: [
                        new Widget.Icon({
                            className: "icon",
                            icon: props.icon,
                            visible: props.icon,
                            css: "font-size: 20px; margin-right: 6px;"
                        } as Widget.IconProps),
                        new Widget.Label({
                            className: "title",
                            halign: Gtk.Align.START,
                            hexpand: true,
                            truncate: true,
                            label: props.title
                        } as Widget.LabelProps),
                        new Widget.Box({
                            visible: (props.endWidget instanceof Binding) ? 
                                props.endWidget.as(Boolean)
                            : props.endWidget,
                            child: props.endWidget
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps)
            } as Widget.ButtonProps),
            new Widget.Box({
                className: "button-row extra-buttons",
                visible: (props.extraButtons instanceof Binding) ? 
                    props.extraButtons.as(extra => extra.length > 0)
                : (props.extraButtons ? props.extraButtons.length > 0 : false),
                children: props.extraButtons
            } as Widget.BoxProps)
        ]
    } as Widget.BoxProps);
}
