import { Page, PageButton } from "../Page";
import { Wireplumber } from "../../../../modules/volume";
import { Gtk } from "ags/gtk4";
import { tr } from "../../../../i18n/intl";
import { createBinding, For } from "ags";
import { lookupIcon } from "../../../../modules/apps";

import AstalWp from "gi://AstalWp?version=0.1";


export const PageMicrophone = <Page
    id={"microphone"}
    title={tr("control_center.pages.microphone.title")}
    description={tr("control_center.pages.microphone.description")}
    content={() => [
        <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} />,
        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <For each={createBinding(Wireplumber.getWireplumber().get_audio()!, "microphones")}>
                {(source: AstalWp.Endpoint) => <PageButton class={
                      createBinding(source, "isDefault").as(isDefault => isDefault ? "selected" : "")
                  } icon={createBinding(source, "icon").as(ico => lookupIcon(ico) ? 
                      ico : "audio-input-microphone-symbolic")} title={
                    createBinding(source, "description").as(desc => desc ?? "Microphone")
                  } actionClicked={() => !source.isDefault && source.set_is_default(true)}
                  endWidget={
                    <Gtk.Image iconName={"object-select-symbolic"} visible={
                        createBinding(source, "isDefault")} css={"font-size: 18px;"}
                    />
                  } 
                />}
            </For>
        </Gtk.Box>
    ]}
/> as Page;
