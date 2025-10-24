import { Page, PageButton } from "../Page";
import { Astal, Gtk } from "ags/gtk4";
import { getAppIcon, lookupIcon } from "../../../../modules/apps";
import { Wireplumber } from "../../../../modules/volume";
import { tr } from "../../../../i18n/intl";
import { createBinding, For } from "ags";
import { createScopedConnection, variableToBoolean } from "../../../../modules/utils";

import AstalWp from "gi://AstalWp";
import GObject from "gi://GObject?version=2.0";
import Pango from "gi://Pango?version=1.0";


export const PageSound = <Page
    id={"sound"}
    title={tr("control_center.pages.sound.title")}
    description={tr("control_center.pages.sound.description")}
    content={() => [
        <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} />,
        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <For each={createBinding(Wireplumber.getWireplumber().audio!, "speakers")}>
                {(sink: AstalWp.Endpoint) => 
                    <PageButton class={createBinding(sink, "isDefault").as(isDefault =>
                          isDefault ? "selected" : "")} 
                      icon={createBinding(sink, "icon").as(ico =>
                          lookupIcon(ico) ? ico : "audio-card-symbolic")}
                      title={createBinding(sink, "description").as(desc =>
                          desc ?? "Speaker")}
                      actionClicked={() => !sink.isDefault && sink.set_is_default(true)}
                      endWidget={
                          <Gtk.Image iconName={"object-select-symbolic"}
                            visible={createBinding(sink, "isDefault")}
                            css={"font-size: 18px;"}
                          />
                      }
                />}
            </For>
        </Gtk.Box>,
        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <Gtk.Label class={"sub-header"} label={tr("apps")} xalign={0} 
              visible={variableToBoolean(
                  createBinding(Wireplumber.getWireplumber().audio!, "streams")
              )}
            />
            <For each={createBinding(Wireplumber.getWireplumber().audio!, "streams")}>
                {(stream: AstalWp.Stream) => 
                    <Gtk.Box hexpand $={(self) => {
                        const controllerMotion = Gtk.EventControllerMotion.new();

                        self.add_controller(controllerMotion);
                        createScopedConnection(controllerMotion, "enter", () => {
                            const revealer = self.get_last_child()!.get_first_child() as Gtk.Revealer;
                            revealer.set_reveal_child(true);
                        });
                        createScopedConnection(controllerMotion, "leave", () => {
                            const revealer = self.get_last_child()!.get_first_child() as Gtk.Revealer;
                            revealer.set_reveal_child(false);
                        });
                    }}>
                        <Gtk.Image iconName={createBinding(stream, "name").as(name => 
                            getAppIcon(name.split(' ')[0]) ?? "application-x-executable-symbolic")}
                          css={"font-size: 18px; margin-right: 6px;"} />

                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} hexpand={true}>
                            <Gtk.Revealer transitionDuration={180} 
                              transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                                
                                <Gtk.Label label={createBinding(stream, "description").as(desc =>
                                      desc ?? "Unnamed audio stream")} 
                                  ellipsize={Pango.EllipsizeMode.END}
                                  tooltipText={createBinding(stream, "name")}
                                  class={"name"} xalign={0}
                                />
                            </Gtk.Revealer>

                            <Astal.Slider drawValue={false} value={createBinding(stream, "volume")} 
                              onChangeValue={(_, __, value) => stream.set_volume(value)}
                              hexpand min={0} max={1.5}
                            />
                        </Gtk.Box>
                    </Gtk.Box>
                }
            </For>
        </Gtk.Box>
    ]}
/> as Page;
