import { Gtk } from "ags/gtk4";
import { Separator } from "../../../widget/Separator";
import { Accessor, createBinding, createRoot, For, Node } from "ags";
import { gtype, property, register } from "ags/gobject";
import { variableToBoolean } from "../../../modules/utils";

import Pango from "gi://Pango?version=1.0";
import GObject from "gi://GObject?version=2.0";


export type BottomButton = {
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    tooltipText?: string | Accessor<string>;
    tooltipMarkup?: string | Accessor<string>;
    actionClicked?: () => void;
};

export type HeaderButton = {
    label?: string|Accessor<string>;
    icon: string|Accessor<string>;
    tooltipText?: string | Accessor<string>;
    tooltipMarkup?: string | Accessor<string>;
    actionClicked?: () => void;
};

@register({ GTypeName: "Page" })
export class Page extends GObject.Object {
    readonly #id: string;
    readonly #create: () => Node;

    public readonly actionClosed?: () => void;
    public readonly actionOpen?: () => void;
    public get id() { return this.#id; }

    @property(String)
    title: string;

    @property(gtype<string|null>(String))
    description: string|null = null;

    @property(gtype<Gtk.Orientation>(Number))
    orientation: Gtk.Orientation = Gtk.Orientation.VERTICAL;

    @property(Number)
    spacing: number = 4;

    @property(Array<HeaderButton>)
    headerButtons: Array<HeaderButton> = [];
    @property(Array<BottomButton>)
    bottomButtons: Array<BottomButton> = [];


    constructor(props: {
        id: string;
        title: string;
        description?: string;
        headerButtons?: Array<HeaderButton>;
        bottomButtons?: Array<BottomButton>;
        orientation?: Gtk.Orientation;
        spacing?: number;
        content: () => Node;
        actionOpen?: () => void;
        actionClosed?: () => void;
    }) {
        super();

        this.#id = props.id;
        this.#create = props.content;

        this.title = props.title;
        this.actionClosed = props.actionClosed;
        this.actionOpen = props.actionOpen;

        if(props.orientation != null)
            this.orientation = props.orientation;

        if(props.description != null)
            this.description = props.description;

        if(props.spacing != null)
            this.spacing = props.spacing;

        if(props.headerButtons != null)
            this.headerButtons = props.headerButtons;

        if(props.bottomButtons != null)
            this.bottomButtons = props.bottomButtons;

        if(props.actionOpen != null)
            this.actionOpen = props.actionOpen;

        if(props.actionClosed != null)
            this.actionClosed = props.actionClosed;
    }

    public create(): Gtk.Box {
        return createRoot((dispose) => 
            <Gtk.Box hexpand class={`page container ${this.#id ?? ""}`} cssName={"page"} name={"page"}
              orientation={Gtk.Orientation.VERTICAL} 
              onDestroy={() => dispose()}>

                <Gtk.Box class={"header"} orientation={Gtk.Orientation.VERTICAL}>
                    <Gtk.Box class={"top"} hexpand>
                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} hexpand>
                            <Gtk.Label class={"title"} label={createBinding(this, "title")} xalign={0} 
                              ellipsize={Pango.EllipsizeMode.END} />

                            <Gtk.Label class={"description"} label={createBinding(this, "description").as(desc =>
                                  desc ?? ""
                              )} xalign={0} ellipsize={Pango.EllipsizeMode.END} 
                              visible={variableToBoolean(createBinding(this, "description"))} />
                        </Gtk.Box>
                        <Gtk.Box class={"button-row"} visible={variableToBoolean(
                            createBinding(this, "headerButtons")
                        )} hexpand={false}>

                            <For each={createBinding(this, "headerButtons")}>
                                {(button: HeaderButton) => 
                                    <Gtk.Button class={"header-button"} label={button.label}
                                      iconName={button.icon} onClicked={() => button.actionClicked?.()}
                                      tooltipText={button.tooltipText} tooltipMarkup={button.tooltipMarkup}
                                    />
                                }
                            </For>
                        </Gtk.Box>
                    </Gtk.Box>
                </Gtk.Box>
                <Gtk.Box class={"content"} hexpand={false} orientation={createBinding(this, "orientation")} 
                  spacing={createBinding(this, "spacing")}>

                    {this.#create()}
                </Gtk.Box>
                <Separator alpha={.2} spacing={6} orientation={Gtk.Orientation.VERTICAL}
                  visible={variableToBoolean(createBinding(this, "bottomButtons"))} 
                />
                <Gtk.Box class={"bottom-buttons"} orientation={Gtk.Orientation.VERTICAL}
                  visible={variableToBoolean(createBinding(this, "bottomButtons"))} spacing={2}>
                
                    <For each={createBinding(this, "bottomButtons")}>
                        {(button: BottomButton) => 
                            <PageButton actionClicked={() => button.actionClicked?.()} 
                              tooltipText={button.tooltipText}
                              tooltipMarkup={button.tooltipMarkup}
                              title={button.title}
                              description={button.description}
                            />
                        }
                    </For>
                </Gtk.Box>
            </Gtk.Box> as Gtk.Box
        );
    }

    public static getContent(pageWidget: Gtk.Box) {
        return pageWidget.get_first_child()!.get_next_sibling()! as Gtk.Box;
    }
}

export function PageButton({ onUnmap, ...props }: {
    class?: string | Accessor<string>;
    icon?: string | Accessor<string>;
    title: string | Accessor<string>;
    endWidget?: Node;
    description?: string | Accessor<string>;
    extraButtons?: Node;
    maxWidthChars?: number | Accessor<number>;
    onUnmap?: (self: Gtk.Box) => void;
    actionClicked?: (self: Gtk.Button) => void;
    tooltipText?: string | Accessor<string>;
    tooltipMarkup?: string | Accessor<string>;
}): Gtk.Box {
    return <Gtk.Box onUnmap={(self) => onUnmap?.(self)} class={"page-button"}>
        <Gtk.Button onClicked={props.actionClicked} class={props.class} hexpand
          tooltipText={props.tooltipText} tooltipMarkup={props.tooltipMarkup}>

            <Gtk.Box class={"container"} hexpand>
                {props.icon && <Gtk.Image iconName={props.icon} visible={variableToBoolean(props.icon)}
                    css={"font-size: 20px; margin-right: 6px;"} />}

                <Gtk.Box orientation={Gtk.Orientation.VERTICAL} hexpand vexpand={false}>
                    <Gtk.Label class={"title"} xalign={0} tooltipText={props.title}
                      ellipsize={Pango.EllipsizeMode.END} label={props.title}
                      maxWidthChars={props.maxWidthChars ?? 28}
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

        <Gtk.Box class={"extra-buttons"} visible={variableToBoolean(props.extraButtons)}>
            {props.extraButtons as Node}
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
}
