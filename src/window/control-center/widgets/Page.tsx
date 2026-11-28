import { Gtk } from "ags/gtk4";
import { Separator } from "../../../widget/Separator";
import { Accessor, createBinding, For, This } from "ags";
import { getter, gtype, property, register, signal } from "ags/gobject";
import { variableToBoolean } from "../../../modules/utils";
import Pango from "gi://Pango?version=1.0";
import GObject from "gi://GObject?version=2.0";
import GLib from "gi://GLib?version=2.0";
import type Pages from "./pages";


@register({ GTypeName: "ClshCCPage", Implements: [Gtk.Buildable] })
class Page extends Gtk.Box {
    declare readonly $signals: Page.SignalSignatures;
    readonly #id: string;
    readonly #container: Gtk.Box;

    @signal()
    closed() {}

    @signal()
    open() {}

    @getter(String)
    get id() { return this.#id; }

    @getter(Gtk.Widget)
    get pages() { return this.get_parent()!.parent!.parent as Pages; }

    @property(String)
    title: string;

    @property(gtype<string|null>(String))
    description: string|null = null;

    @property(Array<Page.Button>)
    headerButtons: Array<Page.Button> = [];

    @property(Array<Page.Button>)
    bottomButtons: Array<Page.Button> = [];


    constructor({
        id, title, description, headerButtons, bottomButtons, ...props
    }: Page.ConstructorProps) {
        super({
            cssName: "page",
            orientation: Gtk.Orientation.VERTICAL
        });

        this.#id = id;
        this.title = title;

        if(description != null)
            this.description = description;

        if(headerButtons != null)
            this.headerButtons = headerButtons;

        if(bottomButtons != null)
            this.bottomButtons = bottomButtons;

        this.#container = new Gtk.Box(props);

        void (
            <This this={this as Page} class={`container ${this.id ?? ""}`}>
                <Gtk.Box class={"header"} orientation={Gtk.Orientation.VERTICAL}>
                    <Gtk.Box class={"top"} hexpand spacing={6}>
                        <Gtk.Button iconName="go-previous-symbolic" class="reactive-secondary"
                          onClicked={() => this.pages.close()}
                        />
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
                                {(button: Page.Button) => 
                                    <Gtk.Button class={"header-button"} label={button.label}
                                      iconName={button.iconName} onClicked={() => button.actionClicked?.()}
                                      tooltipText={button.tooltipText} tooltipMarkup={button.tooltipMarkup}
                                    />
                                }
                            </For>
                        </Gtk.Box>
                    </Gtk.Box>
                </Gtk.Box>
                <Gtk.ScrolledWindow hscrollbarPolicy={Gtk.PolicyType.NEVER} propagateNaturalHeight
                  vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}>

                    <This this={this.#container} class="content" 
                      hexpand={false} orientation={Gtk.Orientation.VERTICAL}
                      {...props} 
                    />
                </Gtk.ScrolledWindow>
                <Gtk.Box class={"bottom-buttons"} orientation={Gtk.Orientation.VERTICAL}
                  visible={variableToBoolean(createBinding(this, "bottomButtons"))}
                  spacing={2} valign={Gtk.Align.END} vexpand>

                    <Separator alpha={.2} orientation={Gtk.Orientation.VERTICAL} />
                    <For each={createBinding(this, "bottomButtons")}>
                        {(button: Page.Button) => 
                            <Page.DecoratedButton actionClicked={() => button.actionClicked?.()} 
                              tooltipText={button.tooltipText}
                              tooltipMarkup={button.tooltipMarkup}
                              title={button.label ?? ""}
                              description={button.description}
                            />
                        }
                    </For>
                </Gtk.Box>
            </This>
        );

        // set right after finishing widget building
        this.vfunc_add_child = (builder: Gtk.Builder, child: GObject.Object, type: string|null): void => {
            if(child instanceof Gtk.Widget) {
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this.#container.append(child);
                    return GLib.SOURCE_REMOVE;
                });

                return;
            }

            super.vfunc_add_child(builder, child, type);
        }
    }
}

namespace Page {
    export type Button = {
        label?: string|Accessor<string>;
        iconName?: string|Accessor<string>;
        description?: string|Accessor<string>;
        tooltipText?: string|Accessor<string>;
        tooltipMarkup?: string|Accessor<string>;
        actionClicked?: () => void;
    };

    export interface ConstructorProps extends Partial<Gtk.Box.ConstructorProps> {
        id: string;
        title: string;
        description?: string;
        headerButtons?: Array<Page.Button>;
        bottomButtons?: Array<Page.Button>;
    }

    export interface SignalSignatures extends Gtk.Box.SignalSignatures {
        "open"(): void;
        "closed"(): void;
    }

    export function DecoratedButton({ onUnmap, ...props }: {
        class?: string | Accessor<string>;
        icon?: string | Accessor<string>;
        title: string | Accessor<string>;
        endWidget?: JSX.Element;
        description?: string | Accessor<string>;
        extraButtons?: JSX.Element;
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
                {props.extraButtons as JSX.Element}
            </Gtk.Box>
        </Gtk.Box> as Gtk.Box;
    }
}

export default Page;
