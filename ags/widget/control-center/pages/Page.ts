import { Binding, register } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Separator, SeparatorProps } from "../../Separator";

export type PageProps = {
    setup?: () => void;
    onClose?: () => void;
    id: string;
    className?: string | Binding<string>;
    title: string | Binding<string>;
    description?: string | Binding<string>;
    headerButtons?: Array<Gtk.Button> | Binding<Array<Gtk.Button>>;
    bottomButtons?: Array<BottomButton> | Binding<Array<BottomButton>>;
    orientation?: Gtk.Orientation | Binding<Gtk.Orientation>;
    spacing?: number;
    child?: Gtk.Widget | Binding<Gtk.Widget>;
    children?: Array<Gtk.Widget> | Binding<Array<Gtk.Widget>>;
};

export type BottomButton = {
    title: string | Binding<string>;
    description?: string | Binding<string>;
    tooltipText?: string | Binding<string>;
    tooltipMarkup?: string | Binding<string>;
    onClick?: () => void;
};

export { Page };

@register({ GTypeName: "Page" })
class Page extends Widget.Box {
    readonly #id: string | number;
    readonly bottomButtons?: Array<BottomButton>;

    #title: string | Binding<string>;
    #description?: string | Binding<string>;

    public get title() { return this.#title; }
    public get description() { return this.#description; }
    public get id() { return this.#id; }
    public onClose?: () => void;

    constructor(props: PageProps) {
        super({
            hexpand: true,
            orientation: Gtk.Orientation.VERTICAL,
            className: (props.className instanceof Binding) ? 
                props.className.as((clsName) => `page ${ clsName ?? "" }`)
            : `page ${props.className ?? ""}`,
            setup: props.setup,
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
                } as Widget.BoxProps),
                Separator({
                    alpha: .2,
                    spacing: 6,
                    orientation: Gtk.Orientation.VERTICAL,
                    visible: (props.bottomButtons instanceof Binding) ? 
                        props.bottomButtons.as(buttons => buttons.length > 0)
                    : (!props.bottomButtons ? false : props.bottomButtons.length > 0)
                } as SeparatorProps),
                new Widget.Box({
                    className: "bottom-buttons",
                    orientation: Gtk.Orientation.VERTICAL,
                    visible: (props.bottomButtons instanceof Binding) ? 
                        props.bottomButtons.as(buttons => buttons.length > 0)
                    : (!props.bottomButtons ? false : props.bottomButtons.length > 0),
                    spacing: 2,
                    children: (props.bottomButtons instanceof Binding) ?
                        props.bottomButtons.as(buttons => buttons.map(button => 
                                new Widget.Button({
                                    onClicked: button.onClick,
                                    tooltipMarkup: button.tooltipMarkup,
                                    tooltipText: button.tooltipText,
                                    child: new Widget.Box({
                                        orientation: Gtk.Orientation.VERTICAL,
                                        children: [
                                            new Widget.Label({
                                                className: "title",
                                                label: button.title,
                                                xalign: 0
                                            } as Widget.LabelProps),
                                            new Widget.Label({
                                                className: "description",
                                                label: button.description,
                                                visible: Boolean(button.description),
                                                xalign: 0
                                            } as Widget.LabelProps)
                                        ]
                                    } as Widget.BoxProps)
                                } as Widget.ButtonProps)
                            )
                        )
                    : (!props.bottomButtons ? [] : props.bottomButtons.map(button => 
                        new Widget.Button({
                            onClicked: button.onClick,
                            tooltipMarkup: button.tooltipMarkup,
                            tooltipText: button.tooltipText,
                            child: new Widget.Box({
                                orientation: Gtk.Orientation.VERTICAL,
                                children: [
                                    new Widget.Label({
                                        className: "title",
                                        label: button.title,
                                        xalign: 0
                                    } as Widget.LabelProps),
                                    new Widget.Label({
                                        className: "description",
                                        label: button.description,
                                        visible: Boolean(button.description),
                                        xalign: 0
                                    } as Widget.LabelProps)
                                ]
                            } as Widget.BoxProps)
                        } as Widget.ButtonProps)
                    ))
                } as Widget.BoxProps)
            ]
        });

        this.#id = props.id;
        this.#title = props.title;
        this.#description = props.description;

        this.onClose = props.onClose;
    }
}

export function PageButton({ onDestroy, ...props }: {
    className?: string | Binding<string>;
    icon?: string | Binding<string>;
    title: string | Binding<string>;
    endWidget?: Gtk.Widget | Binding<Gtk.Widget>;
    description?: string | Binding<string>;
    extraButtons?: Array<Widget.Button> | Binding<Array<Gtk.Widget>>;
    switches?: Array<Widget.Switch> | Binding<Array<Gtk.Widget>>;
    onDestroy?: (self: Widget.Box) => void;
    onClick?: (self: Widget.Button) => void;
    tooltipText?: string | Binding<string>;
    tooltipMarkup?: string | Binding<string>;
}): Gtk.Widget {
    return new Widget.Box({
        onDestroy,
        children: [
            new Widget.Button({
                onClick: props.onClick,
                className: props.className,
                hexpand: true,
                tooltipText: props.tooltipText,
                tooltipMarkup: props.tooltipMarkup,
                child: new Widget.Box({
                    className: "page-button",
                    orientation: Gtk.Orientation.HORIZONTAL,
                    expand: true,
                    children: [
                        new Widget.Icon({
                            className: "icon",
                            icon: props.icon,
                            visible: props.icon,
                            hexpand: false,
                            css: "font-size: 20px; margin-right: 6px;"
                        } as Widget.IconProps),
                        new Widget.Box({
                            orientation: Gtk.Orientation.VERTICAL,
                            hexpand: true,
                            vexpand: false,
                            children: [ 
                                new Widget.Label({
                                    className: "title",
                                    xalign: 0,
                                    //truncate: true,
                                    label: (props.title instanceof Binding) ? 
                                        props.title.as((title) => 
                                            `${title.substring(0, 35)}${
                                                title.length > 35 ? '…' : ""}`)
                                    : `${props.title.substring(0, 35)}${
                                        props.title.length > 35 ? '…' : ""}`,
                                    tooltipText: props.title,
                                } as Widget.LabelProps),
                                new Widget.Label({
                                    className: "description",
                                    xalign: 0,
                                    visible: (props.description instanceof Binding) ?
                                        props.description.as(Boolean)
                                    : Boolean(props.description),
                                    label: props.description,
                                    truncate: true,
                                    tooltipText: props.description
                                } as Widget.LabelProps),
                            ]
                        } as Widget.BoxProps),
                        new Widget.Box({
                            visible: (props.endWidget instanceof Binding) ? 
                                props.endWidget.as(Boolean)
                            : props.endWidget,
                            halign: Gtk.Align.END,
                            child: props.endWidget,
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps)
            } as Widget.ButtonProps),
             new Widget.Box({
                //className: "switches",
                visible: (props.switches instanceof Binding) ? props.switches.as(Boolean) : Boolean(props.switches),
                children: props.switches
            } as Widget.BoxProps),
            new Widget.Box({
                className: "extra-buttons button-row",
                visible: (props.extraButtons instanceof Binding) ? 
                    props.extraButtons.as(extra => extra.length > 0)
                : (props.extraButtons ? props.extraButtons.length > 0 : false),
                children: props.extraButtons
            } as Widget.BoxProps)
        ]
    } as Widget.BoxProps);
}
