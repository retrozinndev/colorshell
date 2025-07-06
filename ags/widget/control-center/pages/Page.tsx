import { register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import { Separator } from "../../Separator";
import { Accessor, For } from "ags";
import { transform, transformWidget, variableToBoolean, WidgetNodeType } from "../../../scripts/utils";
import Pango from "gi://Pango?version=1.0";

export type PageProps = {
    $?: () => void;
    onClose?: () => void;
    id: string;
    class?: string | Accessor<string>;
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    headerButtons?: Array<JSX.Element> | Accessor<Array<JSX.Element>>;
    bottomButtons?: Array<BottomButton> | Accessor<Array<BottomButton>>;
    orientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
    spacing?: number;
    children?: WidgetNodeType;
};

export type BottomButton = {
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    tooltipText?: string | Accessor<string>;
    tooltipMarkup?: string | Accessor<string>;
    onClick?: () => void;
};

export { Page };

@register({ GTypeName: "Page" })
class Page extends Gtk.Box {
    readonly #id: string | number;
    readonly bottomButtons?: Array<BottomButton>;

    #subs: Array<() => void> = [];
    #title: string | Accessor<string>;
    #description?: string | Accessor<string>;

    public get title() { return this.#title; }
    public get description() { return this.#description; }
    public get id() { return this.#id; }
    public onClose?: () => void;

    constructor(props: PageProps) {
        super({
            hexpand: true,
            orientation: Gtk.Orientation.VERTICAL
        });

        this.#id = props.id;
        this.#title = props.title;
        this.#description = props.description;

        if(props.class instanceof Accessor) {
            this.#subs.push(props.class.subscribe(() => {
                const clss = (props.class as Accessor<string>).get();

                this.cssClasses = ["page", ...clss.split(' ').filter(s => s !== "")];
            }));
        } else {
            if(props.class) 
                this.cssClasses = ["page", 
                    ...(props.class as string).split(' ').filter(s => s)];
            else
                this.add_css_class("page");
        }

        this.prepend(<Gtk.Box class={"header"} orientation={Gtk.Orientation.VERTICAL}
            hexpand={true}>
            
            <Gtk.Box class={"top"}>
                <Gtk.Label hexpand={true} class={"title"} ellipsize={Pango.EllipsizeMode.END}
                  visible={variableToBoolean(props.title)} label={props.title}
                  halign={Gtk.Align.START} />
                
                {props.headerButtons && <Gtk.Box class={"button-row"} visible={variableToBoolean(props.headerButtons)}>
                    {
                        (props.headerButtons instanceof Accessor) ? 
                            <For each={props.headerButtons}>
                                {(button) => button}
                            </For>
                        : props.headerButtons
                    }
                </Gtk.Box>}
                
                <Gtk.Label class={"description"} hexpand={true} ellipsize={Pango.EllipsizeMode.END}
                  xalign={0} visible={variableToBoolean(props.description)} label={props.description} />

            </Gtk.Box>
        </Gtk.Box> as Gtk.Box);

        this.append(<Gtk.Box class={"content"} spacing={props.spacing ?? 4} hexpand={true} vexpand={true}
          orientation={props.orientation ?? Gtk.Orientation.VERTICAL}>

            {props.children}
        </Gtk.Box> as Gtk.Box);

        this.append(<Separator alpha={.2} spacing={6} orientation={Gtk.Orientation.VERTICAL}
            visible={(props.bottomButtons instanceof Accessor) ? 
                props.bottomButtons.as(buttons => buttons.length > 0)
            : (!props.bottomButtons ? false : props.bottomButtons.length > 0)} 
        /> as Gtk.Widget);

        this.append(<Gtk.Box class={"bottom-buttons"} orientation={Gtk.Orientation.VERTICAL}
          visible={variableToBoolean(props.bottomButtons)} spacing={2}>
            
            {transformWidget(props.bottomButtons, (button) => 
                <Gtk.Button onClicked={button?.onClick} tooltipText={button?.tooltipText}
                  tooltipMarkup={button?.tooltipMarkup}>

                    <Gtk.Label class={"title"} label={button?.title} xalign={0} />
                    <Gtk.Label class={"description"} label={button?.description} 
                      xalign={0} visible={variableToBoolean(button?.description)} />
                </Gtk.Button>
            )}
        </Gtk.Box> as Gtk.Box);

        this.onClose = props.onClose;
        props.$?.();
    }
}

function BottomButton(props: BottomButton) {
    return <Gtk.Button onClicked={props.onClick} tooltipMarkup={props.tooltipMarkup}
      tooltipText={props.tooltipText}>

        <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
            <Gtk.Label class={"title"} label={props.title} xalign={0} />
            <Gtk.Label class={"description"} label={props.description} 
              visible={Boolean(props.description)} xalign={0} />
        </Gtk.Box>
    </Gtk.Button> as Gtk.Button;
}

export function PageButton({ onDestroy, ...props }: {
    class?: string | Accessor<string>;
    icon?: string | Accessor<string>;
    title: string | Accessor<string>;
    endWidget?: WidgetNodeType;
    description?: string | Accessor<string>;
    extraButtons?: Array<WidgetNodeType> | WidgetNodeType;
    onDestroy?: (self: Gtk.Box) => void;
    onClick?: (self: Gtk.Button) => void;
    tooltipText?: string | Accessor<string>;
    tooltipMarkup?: string | Accessor<string>;
}) {
    return <Gtk.Box onDestroy={onDestroy}>
        <Gtk.Button onClicked={props.onClick} class={props.class} hexpand={true}
          tooltipText={props.tooltipText} tooltipMarkup={props.tooltipMarkup}>

            <Gtk.Box class={"page-button"} hexpand={true} vexpand={true}>
                {props.icon && <Gtk.Image iconName={props.icon} visible={variableToBoolean(props.icon)}
                    css={"font-size: 20px; margin-right: 6px;"} />}

                <Gtk.Box orientation={Gtk.Orientation.VERTICAL} hexpand={true} vexpand={false}>
                    <Gtk.Label class={"title"} xalign={0} tooltipText={props.title}
                      ellipsize={Pango.EllipsizeMode.END} label={
                          transform(props.title, (title) => 
                              `${title.substring(0, 35)}${title.length > 35 ? '…' : ""}`)
                      }
                    />
                    <Gtk.Label class={"description"} xalign={0} visible={variableToBoolean(props.description)}
                      label={props.description} ellipsize={Pango.EllipsizeMode.END} 
                      tooltipText={props.description} />
                </Gtk.Box>

                <Gtk.Box visible={variableToBoolean(props.endWidget)} halign={Gtk.Align.END}>
                    {props.endWidget && props.endWidget}
                </Gtk.Box>
            </Gtk.Box>
        </Gtk.Button>

        <Gtk.Box class={"extra-buttons button-row"} visible={variableToBoolean(props.extraButtons)}>
            {props.extraButtons}
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
}
