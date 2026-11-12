import { Gtk } from "ags/gtk4";
import Windows from "../../../window";
import { createBinding } from "ags";


export const Apps = () => 
    <Gtk.Button class={createBinding(Windows.getDefault(), "openWindows")(function () {
          return `apps ${Windows.getDefault().isOpen("apps-drawer") ? "open" : ""}`
      })} iconName={"applications-other-symbolic"} halign={Gtk.Align.CENTER}
      hexpand tooltipText={tr("apps")} onClicked={() => 
          Windows.getDefault().open("apps-drawer")}
    />;
