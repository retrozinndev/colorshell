import { Astal, Gdk, Gtk } from "ags/gtk4";
import { execApp, getAppIcon, getApps, getAstalApps } from "../../modules/apps";
import { getPopupWindowContainer, PopupWindow } from "../../widget/PopupWindow";

import AstalApps from "gi://AstalApps";
import Pango from "gi://Pango?version=1.0";
import { createRoot, createState } from "ags";
import { escapeUnintendedMarkup } from "../../modules/utils";


const ignoredKeys = [
    Gdk.KEY_Right, 
    Gdk.KEY_Down, 
    Gdk.KEY_Up, 
    Gdk.KEY_Shift_L,
    Gdk.KEY_Shift_R,
    Gdk.KEY_Shift_Lock,
    Gdk.KEY_Left, 
    Gdk.KEY_Return, 
    Gdk.KEY_space
];

export const AppsWindow = (mon: number) => {
    const [results, setResults] = createState(getApps() as Array<AstalApps.Application>);

    return <PopupWindow namespace="apps-window" layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE} monitor={mon} marginTop={64} 
      class={"apps-window"} orientation={Gtk.Orientation.VERTICAL}
      cssBackgroundWindow="background: rgba(0, 0, 0, .2);" hexpand
      actionKeyPressed={(self, key) => {
          const entry = getPopupWindowContainer(self).get_first_child()!
              .get_first_child()!.get_first_child()! as Gtk.SearchEntry;

          for(const ignoredKey of ignoredKeys) 
              if(key === ignoredKey) return

          entry?.grab_focus();
      }}>
        <Gtk.SearchEntry hexpand={false} halign={Gtk.Align.CENTER}
          onSearchChanged={(self) => {
              setResults(getAstalApps().fuzzy_query(self.text.trim()));
          }}
          onStopSearch={(self) => (self.get_root() as Astal.Window)?.close()} 
        />

        <Gtk.ScrolledWindow propagateNaturalHeight propagateNaturalWidth 
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} hscrollbarPolicy={Gtk.PolicyType.NEVER}>

            <Gtk.FlowBox rowSpacing={16} columnSpacing={10} homogeneous vexpand={false} hexpand={false}
             orientation={Gtk.Orientation.HORIZONTAL}
             $={self => {
                 function refresh(): void {
                     const apps = results.get();

                     self.remove_all();
                     for(const app of apps) {
                        const widget = AppWidget(app);

                        self.insert(widget, -1);
                        widget.set_size_request(150, 150);
                     }
                 }

                 const sub = results.subscribe(() => refresh());
                 const id = self.connect("destroy", () => {
                     sub();
                     self.disconnect(id);
                 });

                 refresh();
             }}
            />
        </Gtk.ScrolledWindow>
    </PopupWindow>
}

function AppWidget(app: AstalApps.Application): Gtk.Widget {
    return createRoot((dispose) => 
        <Gtk.Button widthRequest={150} heightRequest={150} tooltipMarkup={`${
            escapeUnintendedMarkup(app.name)}${app.description ? 
              `\n<span foreground="#7f7f7f">${
                  escapeUnintendedMarkup(app.description)
              }</span>`
            : ""}`
          } onClicked={(self) => {
              execApp(app);
              (self.get_root() as Astal.Window)?.close();
          }} onDestroy={() => dispose()}>
            <Gtk.Box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}
              hexpand={false} vexpand={false}>

                <Gtk.Image iconName={getAppIcon(app) ?? "application-x-executable"} 
                  iconSize={Gtk.IconSize.LARGE} vexpand={false} class={"app-icon"} />
                <Gtk.Label ellipsize={Pango.EllipsizeMode.END} label={app.name}
                  valign={Gtk.Align.END} maxWidthChars={30} class={"app-name"} />
            </Gtk.Box>
        </Gtk.Button> as Gtk.Button
    );
}
