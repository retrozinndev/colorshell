import { Page, PageButton } from "../Page";
import { Gtk } from "ags/gtk4";
import { lookupIcon } from "../../../../modules/apps";
import { Accessor, createBinding, For } from "ags";
import { variableToBoolean } from "../../../../modules/utils";
import Wireplumber from "../../../../modules/volume";
import AstalWp from "gi://AstalWp";
import AppStreamSlider from "../AppStreamSlider";


export const PageSound = <Page
    id={"sound"}
    title={tr("control_center.pages.sound.title")}
    description={tr("control_center.pages.sound.description")}
    content={() => [
        <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} />,
        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <For each={createBinding(Wireplumber.getWireplumber().get_audio(), "speakers") as Accessor<Array<AstalWp.Endpoint>>}>
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
            <For each={createBinding(Wireplumber.getWireplumber().get_audio(), "streams") as Accessor<Array<AstalWp.Stream>>}>
                {(st: AstalWp.Stream) => <AppStreamSlider stream={st} />}
            </For>
        </Gtk.Box>
    ]}
/> as Page;
