import { Gtk } from "ags/gtk4";
import Windows from "../../../window";
import { createBinding } from "ags";


export const Apps = () => 
    <Gtk.Button class={createBinding(Windows.getDefault(), "openWindows").as((openWindows) => 
          `apps ${Object.hasOwn(openWindows, "apps-window") ? "open" : ""}`
      )} iconName={"applications-other-symbolic"} halign={Gtk.Align.CENTER}
      hexpand tooltipText={tr("apps")} onClicked={() => 
          Windows.getDefault().open("apps-window")}
    />;
