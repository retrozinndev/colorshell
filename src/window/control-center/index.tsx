import { Gtk } from "ags/gtk4";
import { PopupWindow } from "../../widget/PopupWindow";
import { QuickActions } from "./widgets/QuickActions";
import { NotifHistory } from "./widgets/NotifHistory";
import { Tiles } from "./widgets/tiles";
import { Sliders } from "./widgets/Sliders";
import { generalConfig } from "../../config";
import { getter, register } from "ags/gobject";
import { createBinding, This } from "ags";
import Windows from "..";
import Adw from "gi://Adw?version=1";
import Pages from "./widgets/pages";
import { PageMicrophone } from "./widgets/pages/Microphone";
import { PageNetwork } from "./widgets/pages/Network";
import { PageBluetooth } from "./widgets/pages/Bluetooth";
import { PageNightLight } from "./widgets/pages/NightLight";
import { PageBacklight } from "./widgets/pages/Backlight";
import { PageSound } from "./widgets/pages/Sound";


@register({ GTypeName: "ClshControlCenter" })
class ControlCenterWindow extends PopupWindow {
    #pages!: Pages;

    @getter(Gtk.Widget)
    get pages() { return this.#pages; };

    constructor(props: Partial<PopupWindow.ConstructorProps>) {
        super({
            namespace: "control-center",
            cssName: "controlcenter",
            marginTop: 10,
            marginRight: 10,
            marginBottom: 10,
            closeOnEscape: false,
            closeOnClickOutside: false,
            widthRequest: 380,
            ...props
        });

        const notifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");
        if(notifPopupHPos === "right") 
            generalConfig.setProperty("notifications.position_h", "left", false);

        this.#pages = new Pages();

        void (
            <This this={this as ControlCenterWindow} onCloseRequest={() => {
                const currentNotifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");

                if(notifPopupHPos === currentNotifPopupHPos) 
                    return;

                generalConfig.setProperty("notifications.position_h", notifPopupHPos, false);
            }}>
                    <Adw.Clamp maximumSize={createBinding(this, "widthRequest")} halign={Gtk.Align.END}
                      valign={Gtk.Align.START}>
                            
                        <Gtk.Box class={"top-container"} orientation={Gtk.Orientation.VERTICAL} spacing={16} 
                          hexpand>

                            <This this={this.#pages as Pages}>
                                <PageNetwork $type="page" />
                                <PageBluetooth $type="page" />
                                <PageNightLight $type="page" />
                                <PageBacklight $type="page" />
                                <PageSound $type="page" />
                                <PageMicrophone $type="page" />

                                <Gtk.Box class={"control-center-container"} vexpand={false} spacing={12}
                                  orientation={Gtk.Orientation.VERTICAL}>
                                    
                                    <QuickActions />
                                    <Tiles ccWindow={this as ControlCenterWindow} />
                                    <Sliders ccWindow={this as ControlCenterWindow} />
                                </Gtk.Box>
                            </This>
                            <NotifHistory />
                        </Gtk.Box>
                    </Adw.Clamp>
            </This>
        );
    }

    back(): void {
        if(this.#pages.isOpen) {
            this.#pages.close();
            return;
        }

        this.close();
    }

    on_escape(): void {
        this.back();
    }

    on_clicked_outside(): void {
        this.back();
    }
}

export const ControlCenter = Windows.forFocusedMonitor(() => 
    <ControlCenterWindow />
);

export default ControlCenterWindow;
