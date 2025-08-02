import { Gtk } from "ags/gtk4";
import { Page, PageButton } from "./Page";
import { tr } from "../../../i18n/intl";
import { Windows } from "../../../windows";
import { Notifications } from "../../../scripts/notifications";
import { execApp } from "../../../scripts/apps";
import { createBinding, createComputed, For, With } from "ags";

import AstalNotifd from "gi://AstalNotifd";
import AstalBluetooth from "gi://AstalBluetooth";


export const BluetoothPage = new Page({
    id: "bluetooth",
    title: tr("control_center.pages.bluetooth.title"),
    spacing: 6,
    description: tr("control_center.pages.bluetooth.description"),
    headerButtons: [{
        icon: createBinding(AstalBluetooth.get_default().adapter, "discovering")
            .as(discovering => !discovering ? 
                    "arrow-circular-top-right-symbolic"
                : "media-playback-stop-symbolic"
            ), 
        tooltipText: createBinding(AstalBluetooth.get_default().adapter, "discovering")
            .as((discovering) => !discovering ? 
                    tr("control_center.pages.bluetooth.start_discovering")
                : tr("control_center.pages.bluetooth.stop_discovering")),
        actionClicked: () => {
            if(AstalBluetooth.get_default().adapter.discovering) {
                AstalBluetooth.get_default().adapter.stop_discovery();
                return;
            }

            AstalBluetooth.get_default().adapter.start_discovery();
        }
    }],
    actionClosed: () => AstalBluetooth.get_default().adapter?.discovering && 
        AstalBluetooth.get_default().adapter.stop_discovery(),
    bottomButtons: [{
        title: tr("control_center.pages.more_settings"),
        actionClicked: () => {
            Windows.getDefault().close("control-center");
            execApp("overskride", "[float; animation slide right]");
        }
    }],
    content: () => [
        <Gtk.Box class={"adapters"} visible={createBinding(AstalBluetooth.get_default(), "adapters")
              .as(adptrs => adptrs.length > 1)
        } spacing={2} orientation={Gtk.Orientation.VERTICAL}>

            <Gtk.Label class={"sub-header"} label={tr("control_center.pages.bluetooth.adapters")} 
              xalign={0} />
            <With value={createBinding(AstalBluetooth.get_default(), "adapters").as(adpts => 
                adpts.length > 1)}>

                {(hasMoreAdapters: boolean) => hasMoreAdapters &&
                    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <For each={createBinding(AstalBluetooth.get_default(), "adapters")}> 
                            {(adapter: AstalBluetooth.Adapter) => {
                                const isSelected = createBinding(AstalBluetooth.get_default(), "adapter").as(a =>
                                    a.address === adapter.address);

                                return <PageButton class={isSelected.as(is => is ? "selected" : "")} 
                                  title={adapter.alias ?? "Adapter"} icon={"bluetooth-active-symbolic"} 
                                  endWidget={
                                      <Gtk.Image iconName={"object-select-symbolic"} visible={isSelected} />
                                  }
                                />;
                            }}
                        </For>
                    </Gtk.Box>
                }
            </With>
        </Gtk.Box>,
        <Gtk.Box class={"connections"} orientation={Gtk.Orientation.VERTICAL} hexpand={true}
          spacing={2}>
            
            <Gtk.Box class={"paired"} orientation={Gtk.Orientation.VERTICAL} spacing={4}
              visible={createBinding(AstalBluetooth.get_default(), "devices").as(devs =>
                devs.filter(dev => dev.paired || dev.connected || dev.trusted).length > 0)}>

                <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} />
                <For each={createBinding(AstalBluetooth.get_default(), "devices").as(devs =>
                  devs.filter(dev => dev.paired || dev.connected || dev.trusted))}>

                    {(dev: AstalBluetooth.Device) => <DeviceWidget device={dev} />}
                </For>
            </Gtk.Box>
            <Gtk.Box class={"discovered"} orientation={Gtk.Orientation.VERTICAL} spacing={4}
              visible={createBinding(AstalBluetooth.get_default(), "devices").as(devs =>
                devs.filter(dev => !dev.connected && !dev.paired && !dev.trusted).length > 0)}>

                <Gtk.Label class={"sub-header"} label={tr("control_center.pages.bluetooth.new_devices")} 
                  xalign={0} />
                <For each={createBinding(AstalBluetooth.get_default(), "devices").as(devs =>
                  devs.filter(dev => !dev.connected && !dev.paired && !dev.trusted))}>
                    {(dev: AstalBluetooth.Device) => <DeviceWidget device={dev} />}
                </For>
            </Gtk.Box>
        </Gtk.Box>
    ]
});

function DeviceWidget({ device }: { device: AstalBluetooth.Device }): Gtk.Widget {
    return <PageButton class={createBinding(device, "connected").as(conn => 
      conn ? "selected" : "")} title={
          createBinding(device, "alias").as(alias => alias ?? "Unknown Device")} 
        icon={createBinding(device, "icon").as(ico => ico ?? "bluetooth-active-symbolic")}
        description={
            createBinding(device, "connecting").as(connecting => 
                connecting ? `${tr("connecting")}...` : "")}
        tooltipText={
            createBinding(device, "connected").as(connected => 
                !connected ? tr("connect") : "")
        } actionClicked={() => {
            if(device.connected) return;

            let skipConnection: boolean = false;
            if(!device.paired) 
                (async () => device.pair())().catch((err: Error) => {
                    skipConnection = true;
                    Notifications.getDefault().sendNotification({
                        appName: "bluetooth",
                        summary: "Device pairing error",
                        body: `Couldn't connect to ${device.alias ?? device.name}, an error occurred: ${err.message || err.stack}`,
                        urgency: AstalNotifd.Urgency.NORMAL
                    })
                }).then(() => device.set_trusted(true));

            if(!skipConnection)
                (async () => device.connect_device(null))().catch((err: Error) => 
                    Notifications.getDefault().sendNotification({
                        appName: "bluetooth",
                        summary: "Device connection error",
                        body: `Couldn't connect to ${device.alias ?? device.name}, an error occurred: ${err.message || err.stack}`,
                        urgency: AstalNotifd.Urgency.NORMAL
                    })
                );
        }}
        endWidget={<Gtk.Box visible={createComputed([
                createBinding(device, "batteryPercentage"),
                createBinding(device, "connected")
            ]).as(([batt, connected]) => connected && (batt > -1))
          }>
            <Gtk.Label halign={Gtk.Align.END} label={
                createBinding(device, "batteryPercentage").as(batt => 
                    `${Math.floor(batt * 100)}%`)} />

            <Gtk.Image iconName={
                createBinding(device, "batteryPercentage").as(batt =>
                    `battery-level-${Math.floor(batt * 100)}-symbolic`)
            } css={"font-size: 16px; margin-left: 6px;"} />
        </Gtk.Box>} extraButtons={<With value={createComputed([
            createBinding(device, "connected"),
            createBinding(device, "trusted")
          ])}>
            {([connected, trusted]: [boolean, boolean]) =>
                <Gtk.Box visible={connected || trusted}>
                    {<Gtk.Button iconName={connected ? 
                          "list-remove-symbolic"
                      : "user-trash-symbolic"} tooltipText={tr(connected ?
                          "disconnect"
                      : "control_center.pages.bluetooth.unpair_device"
                    )} onClicked={() => {
                        if(!connected) {
                            AstalBluetooth.get_default().adapter?.remove_device(device);
                            return;
                        }

                        device.disconnect_device(null);
                    }} />}

                    <Gtk.Button iconName={trusted ? 
                          "shield-safe-symbolic"
                      : "shield-danger-symbolic"} tooltipText={tr(
                          `control_center.pages.bluetooth.${trusted ? "un" : ""}trust_device`
                      )} onClicked={() => device.set_trusted(!trusted)}
                    />
                </Gtk.Box>
            }
        </With>} 
    /> as Gtk.Widget;
}
