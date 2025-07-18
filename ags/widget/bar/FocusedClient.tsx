import { Gtk } from "ags/gtk4";
import AstalHyprland from "gi://AstalHyprland";
import { createBinding, With } from "ags";
import { variableToBoolean } from "../../scripts/utils";
import { getAppIcon, getSymbolicIcon } from "../../scripts/apps";
import Pango from "gi://Pango?version=1.0";

const hyprland = AstalHyprland.get_default();

// Fix empty focused-client on opening a window on an empty workspace
hyprland.connect("client-added", () => hyprland.notify("focused-client"));

export const FocusedClient = () => {
    const focusedClient = createBinding(hyprland, "focusedClient");

    return <Gtk.Box class={"focused-client"} 
      visible={variableToBoolean(createBinding(hyprland, "focusedClient"))}>
        <With value={focusedClient}>
            {(focusedClient) => focusedClient && <Gtk.Box>
                <Gtk.Image iconName={
                    createBinding(focusedClient, "class").as((clss) => 
                        getSymbolicIcon(clss) ?? getAppIcon(clss) ?? 
                          getAppIcon(focusedClient.initialClass) ?? 
                              "application-x-executable-symbolic")
                  } vexpand={true} />
                
                <Gtk.Box valign={Gtk.Align.CENTER} class={"text-content"} 
                  orientation={Gtk.Orientation.VERTICAL}>

                    <Gtk.Label class={"class"} xalign={0} maxWidthChars={55} 
                      ellipsize={Pango.EllipsizeMode.END} 
                      label={createBinding(focusedClient, "class")}
                      tooltipText={createBinding(focusedClient, "class")}/>
                    <Gtk.Label class={"title"} xalign={0} maxWidthChars={50} 
                      ellipsize={Pango.EllipsizeMode.END} 
                      label={createBinding(focusedClient, "title")}
                      tooltipText={createBinding(focusedClient, "title")}/>
                </Gtk.Box>
            </Gtk.Box>}
        </With>
    </Gtk.Box>;
}
