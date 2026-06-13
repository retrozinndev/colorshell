import Compositor from "../../../compositor";
import { Gdk, Gtk } from "ags/gtk4";
import { createBinding, With } from "ags";
import { variableToBoolean } from "../../../modules/utils";
import { getAppIcon, getSymbolicIcon } from "../../../modules/apps";
import Pango from "gi://Pango?version=1.0";
import Adw from "gi://Adw?version=1";


export const FocusedClient = () => {
    const focusedClient = createBinding(Compositor.getDefault(), "focusedClient");

    // TODO fix the warning message for gtk_widget_is_ancestor assertion
    const popover = <Gtk.Popover class={"menu"} hasArrow={false} css={"margin-top: 6px;"}
      position={Gtk.PositionType.TOP}
      onNotifyVisible={(self) => {
          const visible = self.is_visible();

          // it doesn't unfocus when clicking outside, so we have to replicate this in a visible way
          if(!visible)
              self.get_parent()?.set_state_flags(Gtk.StateFlags.NORMAL, true);
      }}>
        <Gtk.ListBox class={"menu"} selectionMode={Gtk.SelectionMode.NONE}
          activateOnSingleClick>

            <Gtk.Button onClicked={() => {
                focusedClient.get()?.kill();
                popover.popdown();
            }}>
                <Adw.ButtonContent iconName="circle-crossed-symbolic" label={tr("kill")} />
            </Gtk.Button>
            <Gtk.Button onClicked={() => {
                focusedClient.get()?.close()
                popover.popdown();
            }}>
                <Adw.ButtonContent iconName="window-close-symbolic" label={tr("close")} />
            </Gtk.Button>
        </Gtk.ListBox>
    </Gtk.Popover> as Gtk.Popover;
    return <Gtk.Box class={"focused-client"} visible={variableToBoolean(focusedClient)}>
        {popover}
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
        <Gtk.GestureClick button={Gdk.BUTTON_PRIMARY | Gdk.BUTTON_SECONDARY}
            onReleased={(self) => {
                const button = self.get_button();

                switch(button) {
                    case Gdk.BUTTON_PRIMARY:
                        focusedClient.get()?.focus();
                        break;

                    case Gdk.BUTTON_SECONDARY:
                        popover.is_visible() ?
                            popover.popdown()
                        : popover.popup();
                        break;
                }
            }}
        />
    </Gtk.Box>;
}
