import { GObject, Variable } from "astal";
import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { cleanExec, getAppIcon, getApps, getAstalApps } from "../scripts/apps";
import AstalApps from "gi://AstalApps";
import { PopupWindow } from "../widget/PopupWindow";

const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export const AppsWindow = (mon: number): (Widget.Window) => {
    const searchString = new Variable<string>("");
    const searchSubscription = searchString.subscribe((str: string) => {
        updateResults(str);
    });

    let results: Array<AstalApps.Application> = [];
    const flowboxConnections: Array<number> = [];

    const flowbox = new Gtk.FlowBox({
        rowSpacing: 6,
        columnSpacing: 6,
        homogeneous: true,
        visible: true,
        minChildrenPerLine: 1,
        activateOnSingleClick: true
    } as Gtk.FlowBox.ConstructorProps);

    const entry = new Widget.Entry({
        className: "entry",
        halign: Gtk.Align.CENTER,
        placeholderText: "Start typing...",
        primary_icon_name: "system-search",
        onChanged: (entry) => searchString.set(entry.text),
        onActivate: () => flowbox.get_selected_children()?.[0]?.get_child()?.activate()
    } as Widget.EntryProps);

    async function updateResults(str?: string) {
        if(!str) results = getApps().sort((a, b) => 
            a.name > b.name ? 1 : -1);
        else results = getAstalApps().fuzzy_query(str);

        // Destroy is handled by GnomeJS
        flowbox.get_children().map(flowboxChild => flowbox.remove(flowboxChild));

        results.map(app => {
            flowbox.insert(AppWidget(app), -1);

            const flowboxchild = flowbox.get_child_at_index(flowbox.get_children().length-1)!.get_child();
            if(!flowboxchild) return;

            flowboxchild.set_valign(Gtk.Align.START);
            flowboxchild.set_halign(Gtk.Align.START);
        });

        const firstChild = flowbox.get_child_at_index(0);
        firstChild && flowbox.select_child(firstChild);
    }

    function AppWidget(app: AstalApps.Application) {
        const connections: Array<number> = [];
        // Astal3.Button doesn't work the way I need, so I'll use normal GtkButton
        const button = new Gtk.Button({
            visible: true,
            widthRequest: 180,
            heightRequest: 140,
            expand: false,
            tooltipMarkup: `${app.name}${app.description ? 
                `\n<span foreground="#7f7f7f">${app.description}</span>`
            : ""}`.replace(/\&/g, "&amp;"),
            child: new Widget.Box({
                orientation: Gtk.Orientation.VERTICAL,
                children: [
                    new Widget.Icon({
                        className: "icon",
                        expand: true,
                        icon: getAppIcon(app) || "application-x-executable"
                    } as Widget.IconProps),
                    new Widget.Label({
                        className: "name",
                        truncate: true,
                        maxWidthChars: 10,
                        valign: Gtk.Align.START,
                        label: app.name || "Unnamed App"
                    } as Widget.LabelProps)
                ]
            } as Widget.BoxProps) as Gtk.Widget,
        } as Gtk.Button.ConstructorProps);

        button.set_can_focus(false);

        const openFun = () => {
            cleanExec(app);
            window.close();
        };

        connections.push(
            button.connect("activate", openFun),
            button.connect("clicked", openFun)
        );

        button.vfunc_destroy = () => {
            connections.map(id => 
                GObject.signal_handler_is_connected(button, id) &&
                    button.disconnect(id)
            );
        };

        return button;
    }

    const window = PopupWindow({
        namespace: "apps-window",
        layer: Astal.Layer.OVERLAY,
        exclusivity: Astal.Exclusivity.IGNORE,
        anchor: TOP | LEFT | RIGHT | BOTTOM,
        monitor: mon,
        cssBackgroundWindow: "background: rgba(0, 0, 0, .2)",
        marginTop: 64,
        onDestroy: () => {
            searchSubscription?.();
            searchString.drop();
            flowboxConnections.map(id => flowbox.disconnect(id));
        },
        onKeyPressEvent: (_, event: Gdk.Event) => {
            if(event.get_keyval()[1] === Gdk.KEY_Escape) {
                _.close();
                return;
            }

            if(event.get_keyval()[1] !== Gdk.KEY_Right &&
              event.get_keyval()[1] !== Gdk.KEY_Down &&
              event.get_keyval()[1] !== Gdk.KEY_Up &&
              event.get_keyval()[1] !== Gdk.KEY_Left &&
              event.get_keyval()[1] !== Gdk.KEY_Return &&
              event.get_keyval()[1] !== Gdk.KEY_space &&
              event.get_keyval()[1] !== Gdk.KEY_Escape) {
                !entry.isFocus && entry.grab_focus_without_selecting();
            }
        },
        child: new Widget.Box({
            className: "apps-window-container",
            expand: true,
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                entry,
                new Widget.Box({
                    className: "apps-area",
                    child: new Widget.Scrollable({
                        vscroll: Gtk.PolicyType.AUTOMATIC,
                        hscroll: Gtk.PolicyType.NEVER,
                        overlayScrolling: true,
                        expand: true,
                        child: flowbox
                    } as Widget.ScrollableProps)
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    });

    const connId = window.connect("focus-in-event", (_) => {
        updateResults();
        window.disconnect(connId);
    });

    flowboxConnections.push(
        flowbox.connect("child-activated", (_, item) => {
            if(!item || !item.get_child()) return;
            item.get_child()!.activate();
        })
    );

    return window;
}
