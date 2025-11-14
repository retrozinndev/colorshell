import { Shell } from "../../app";
import { Gtk } from "ags/gtk4";
import Adw from "gi://Adw?version=1";


export class ConfigWindow extends Adw.Window {

    constructor() {
        super({
            title: "Colorshell Settings",
            application: Shell.getDefault()
        });

        this.set_content(
            <Adw.NavigationSplitView>
                {/* sidebar */}
                <Adw.NavigationPage $type="sidebar">
                    <Adw.HeaderBar>
                        <Gtk.Image iconName={"settings-symbolic"} $type="start" />
                        <Gtk.Label label={"Settings"} $type="title" />
                        <Gtk.Button iconName={"collapse-rtl-symbolic"} $type="end" 
                          onClicked={(self) => {
                              const window = this;

                              
                          }}
                        />
                    </Adw.HeaderBar>
                </Adw.NavigationPage>
            </Adw.NavigationSplitView> as Adw.NavigationSplitView
        );
    }
}
