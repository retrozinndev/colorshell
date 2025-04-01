import { Variable } from "astal";
import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { cleanExec, getAstalApps } from "../scripts/apps";
import AstalApps from "gi://AstalApps";

const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export const AppsWindow = (mon: number): (Widget.Window) => {
    const searchString = new Variable<string>("");
    let searchSubscription: () => void;

    return new Widget.Window({
        namespace: "apps-window",
        layer: Astal.Layer.OVERLAY,
        exclusivity: Astal.Exclusivity.IGNORE,
        anchor: TOP | LEFT | RIGHT | BOTTOM,
        keymode: Astal.Keymode.EXCLUSIVE,
        monitor: mon,
        onDestroy: () => {
            searchString.set("");
            searchSubscription()
        },
        setup: (window) => {
            const flowbox = new Gtk.FlowBox({
                rowSpacing: 6,
                homogeneous: true,
                columnSpacing: 6,
                expand: false,
                orientation: Gtk.Orientation.HORIZONTAL,
                visible: true
            } as Gtk.FlowBox.ConstructorProps);

            const entry = new Widget.Entry({
                className: "entry",
                halign: Gtk.Align.CENTER,
                primary_icon_name: "system-search",
                onChanged: (entry) => {
                    searchString.set(entry.text);
                }
            } as Widget.EntryProps);

            searchSubscription = searchString.subscribe((str: string) => {
                const results: Array<AstalApps.Application> = getAstalApps().fuzzy_query(str);

                // Destroy is handled by GnomeJS
                flowbox.get_children().map(flowboxChild => flowbox.remove(flowboxChild));

                results.map(app => {
                    flowbox.insert(new Widget.Button({
                        onClick: (_button, event: Astal.ClickEvent) => {
                            if(event.button === Astal.MouseButton.PRIMARY) {
                                searchString.set("");
                                entry.text = "";
                                window.close();
                                cleanExec(app);

                                return;
                            }

                            // select app launch options TODO
                        },
                        child: new Widget.Box({
                            orientation: Gtk.Orientation.VERTICAL,
                            children: [
                                new Widget.Icon({
                                    className: "icon",
                                    expand: true,
                                    icon: app.get_icon_name()
                                } as Widget.IconProps),
                                new Widget.Label({
                                    className: "name",
                                    truncate: true,
                                    label: app.get_name()
                                } as Widget.LabelProps)
                            ]
                        } as Widget.BoxProps)
                    } as Widget.ButtonProps), -1);

                    const flowboxchild = flowbox.get_children()[flowbox.get_children().length-1];
                    flowboxchild.set_valign(Gtk.Align.START);
                });

                const firstChild = flowbox.get_child_at_index(0);
                firstChild && flowbox.select_child(firstChild);
            });

            window.add(new Widget.EventBox({
                onClick: () => {
                    searchString.set("");
                    entry.text = "";
                    window.close();
                },
                onKeyPressEvent: (_, event: Gdk.Event) => {
                    if(event.get_keyval()[1] === Gdk.KEY_Escape) {
                        searchString.set("");
                        entry.text = "";
                        window.close();
                    }
                },
                child: new Widget.Box({
                    className: "apps-window-container",
                    expand: true,
                    orientation: Gtk.Orientation.VERTICAL,
                    children: [
                        entry,
                        new Widget.Scrollable({
                            vscroll: Gtk.PolicyType.AUTOMATIC,
                            hscroll: Gtk.PolicyType.NEVER,
                            expand: true,
                            child: flowbox
                        } as Widget.ScrollableProps)
                    ]
                } as Widget.BoxProps)
            } as Widget.EventBoxProps));
        }
    });
}
