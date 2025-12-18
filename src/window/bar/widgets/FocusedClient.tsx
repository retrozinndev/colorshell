import { Compositor } from "../../../modules/compositors";
import { Gtk } from "ags/gtk4";
import { createBinding, With } from "ags";
import { variableToBoolean } from "../../../modules/utils";
import { getAppIcon, getSymbolicIcon } from "../../../modules/apps";

import Pango from "gi://Pango?version=1.0";

export const FocusedClient = () => {
    const focusedClient = createBinding(Compositor.getDefault(), "focusedClient");

    return <Gtk.Box class={"focused-client"} visible={variableToBoolean(focusedClient)}>
        <With value={focusedClient}>
            {(focusedClient) => focusedClient?.class && <Gtk.Box>
                <Gtk.Image iconName={createBinding(focusedClient, "class").as((clss) => 
                      getSymbolicIcon(clss) ?? getAppIcon(clss) ?? 
                          getAppIcon(focusedClient.initialClass) ?? 
                              "application-x-executable-symbolic"
                  )} vexpand
                />
                
                <Gtk.Box valign={Gtk.Align.CENTER} class={"text-content"} 
                  orientation={Gtk.Orientation.VERTICAL}>

                    <Gtk.Label class={"class"} xalign={0} maxWidthChars={55} 
                      ellipsize={Pango.EllipsizeMode.END} 
                      label={createBinding(focusedClient, "class")}
                      tooltipText={createBinding(focusedClient, "class")}
                    />

                    <Gtk.Label class={"title"} xalign={0} maxWidthChars={50} 
                      ellipsize={Pango.EllipsizeMode.END} 
                      label={createBinding(focusedClient, "title")}
                      tooltipText={createBinding(focusedClient, "title")}
                    />
                </Gtk.Box>
            </Gtk.Box>}
        </With>
    </Gtk.Box>;
}
