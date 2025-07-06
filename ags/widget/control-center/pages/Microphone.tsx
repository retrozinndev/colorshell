import { Page, PageButton } from "./Page";
import { Wireplumber } from "../../../scripts/volume";
import { Gtk } from "ags/gtk4";
import { tr } from "../../../i18n/intl";
import { createBinding, For } from "ags";
import AstalWp from "gi://AstalWp?version=0.1";
import { lookupIcon } from "../../../scripts/apps";


export function PageMicrophone(): Page {
    return <Page id={"microphone"} title={tr("control_center.pages.microphone.title")}
      description={tr("control_center.pages.microphone.description")}>

        <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} />
        <For each={createBinding(Wireplumber.getWireplumber().get_audio()!, "microphones")}>
            {(source: AstalWp.Endpoint) => <PageButton class={
                  createBinding(source, "isDefault").as(isDefault => isDefault ? "default" : "")
              } icon={createBinding(source, "icon").as(ico => lookupIcon(ico) ? 
                  ico : "audio-input-microphone-symbolic")} title={
                createBinding(source, "description").as(desc => desc ?? "Microphone")
              } onClick={() => !source.isDefault && source.set_is_default(true)}
              endWidget={
                <Gtk.Image iconName={"object-select-symbolic"} visible={
                    createBinding(source, "isDefault")} css={"font-size: 18px;"}
                />
              } 
            />}
        </For>
    </Page> as Page;
}
