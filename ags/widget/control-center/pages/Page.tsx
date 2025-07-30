import { Gtk } from "ags/gtk4";
import { Separator } from "../../Separator";
import { Accessor, createRoot } from "ags";
import { transformWidget, variableToBoolean, WidgetNodeType } from "../../../scripts/utils";

import Pango from "gi://Pango?version=1.0";


export type PageProps = {
    id: string;
    title: string;
    description?: string;
    headerButtons?: Array<HeaderButton> | Accessor<Array<HeaderButton>>;
    bottomButtons?: Array<BottomButton> | Accessor<Array<BottomButton>>;
    orientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
    spacing?: number | Accessor<number>;
    content: () => WidgetNodeType;
    actionClosed?: () => void;
};

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

export class Page {
    #title: string;
    #description?: string;
    #orientation: Gtk.Orientation|Accessor<
        Gtk.Orientation> = Gtk.Orientation.VERTICAL;
    #spacing: number|Accessor<number> = 4;
    #headerButtons?: Array<HeaderButton>|Accessor<Array<HeaderButton>>;
    #bottomButtons?: Array<BottomButton>|Accessor<Array<BottomButton>>;
    readonly #id?: string;
    readonly #create: () => WidgetNodeType;

    public get id() { return this.#id; }
    public get title() { return this.#title; }
    public get description() { return this.#description; }
    public get headerButtons() { return this.#headerButtons; }
    public get bottomButtons() { return this.#bottomButtons; }
    public readonly actionClosed?: () => void;

    constructor(props: PageProps) {
        this.#id = props.id;
        this.#title = props.title;
        this.#description = props.description;
        this.#create = props.content;
        this.actionClosed = props.actionClosed;

        if(props.orientation != null)
            this.#orientation = props.orientation;

        if(props.spacing != null)
            this.#spacing = props.spacing;

        if(props.headerButtons != null)
            this.#headerButtons = props.headerButtons;
    }

    public create(): Gtk.Box {
        return createRoot((dispose) => 
            <Gtk.Box hexpand class={`page container ${this.#id ?? ""}`} cssName={"page"} name={"page"}
              orientation={Gtk.Orientation.VERTICAL} onUnmap={() => dispose()}>

                <Gtk.Box class={"header"} orientation={Gtk.Orientation.VERTICAL}>
                    <Gtk.Box class={"top"} hexpand>
                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} hexpand>
                            <Gtk.Label class={"title"} label={this.#title} xalign={0} 
                              ellipsize={Pango.EllipsizeMode.END} />

                            <Gtk.Label class={"description"} label={this.#description} 
                              xalign={0} ellipsize={Pango.EllipsizeMode.END} 
                              visible={variableToBoolean(this.#description)} />
                        </Gtk.Box>
                        <Gtk.Box class={"button-row"} visible={variableToBoolean(this.#headerButtons)}
                          hexpand={false}>

                            {this.#headerButtons && transformWidget(this.#headerButtons, (button) =>
                                <Gtk.Button class={"header-button"} label={button.label}
                                  iconName={button.icon} onClicked={() => button.actionClicked?.()}
                                  tooltipText={button.tooltipText} tooltipMarkup={button.tooltipMarkup}
                                />
                            )}
                        </Gtk.Box>
                    </Gtk.Box>
                </Gtk.Box>
                <Gtk.Box class={"content"} hexpand={false} orientation={this.#orientation} 
                  spacing={this.#spacing}>

                    {this.#create()}
                </Gtk.Box>
                <Separator alpha={.2} spacing={6} orientation={Gtk.Orientation.VERTICAL}
                  visible={variableToBoolean(this.#bottomButtons)} 
                />
                <Gtk.Box class={"bottom-buttons"} orientation={Gtk.Orientation.VERTICAL}
                  visible={variableToBoolean(this.#bottomButtons)} spacing={2}>
                
                    {this.#bottomButtons && transformWidget(this.#bottomButtons, (button) => 
                        <Gtk.Button onClicked={() => button?.actionClicked?.()} tooltipText={button?.tooltipText}
                          tooltipMarkup={button?.tooltipMarkup}>

                            <Gtk.Label class={"title"} label={button?.title} xalign={0} />
                            <Gtk.Label class={"description"} label={button?.description} 
                              xalign={0} visible={variableToBoolean(button?.description)} />
                        </Gtk.Button>
                    )}
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
    endWidget?: WidgetNodeType;
    description?: string | Accessor<string>;
    extraButtons?: Array<WidgetNodeType> | WidgetNodeType;
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
            {props.extraButtons}
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
}
