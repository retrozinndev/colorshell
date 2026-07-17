import { Gtk } from "ags/gtk4";
import { Page, PageButton } from "../Page";
import Windows from "../../../../window";
import Notifications from "../../../../modules/notifications";
import { execApp, lookupIcon } from "../../../../modules/apps";
import { createBinding, createComputed, createRoot, For, With } from "ags";
import { variableToBoolean } from "../../../../modules/utils";
import Bluetooth from "../../../../modules/bluetooth";
import AstalNotifd from "gi://AstalNotifd";
import AstalBluetooth from "gi://AstalBluetooth";
import Adw from "gi://Adw?version=1";


export const BluetoothPage = createRoot((dispose) => <Page
    id={"bluetooth"}
    title={tr("control_center.pages.bluetooth.title")}
    spacing={6}
    description={tr("control_center.pages.bluetooth.description")}
    headerButtons={createBinding(Bluetooth.getDefault(), "adapter")(adapter => adapter ? [{
        icon: createBinding(adapter, "discovering")
            (discovering => !discovering ? 
                    "arrow-circular-top-right-symbolic"
                : "media-playback-stop-symbolic"
            ), 
        tooltipText: createBinding(adapter, "discovering")
            ((discovering) => !discovering ? 
                    tr("control_center.pages.bluetooth.start_discovering")
                : tr("control_center.pages.bluetooth.stop_discovering")),
        actionClicked: () => {
            if(adapter.discovering) {
                adapter.stop_discovery();
                return;
            }

            adapter.start_discovery();
        }
    }]: [])}
    actionClosed={() => {
        dispose();

        Bluetooth.getDefault().adapter?.discovering && 
            Bluetooth.getDefault().adapter?.stop_discovery();
    }}
    bottomButtons={[{
        title: tr("control_center.pages.more_settings"),
        actionClicked: () => {
            Windows.getDefault().close("control-center");
            execApp("overskride", "[float; animation slide right]");
        }
    }]}
    content={() => {
        const adapters = createBinding(AstalBluetooth.get_default(), "adapters");
        const devices = createBinding(AstalBluetooth.get_default(), "devices");
        const knownDevices = devices(devs => devs.filter(dev =>
            dev.trusted || dev.paired || dev.connected
        ).sort(dev => dev.connected ? 1 : 0));
        const discoveredDevices = devices(devs => devs.filter(dev =>
            !dev.trusted && !dev.paired && !dev.connected)
        );

        return [
            <Gtk.Box class={"adapters"} visible={adapters(adptrs => adptrs.length > 1)
            } spacing={2} orientation={Gtk.Orientation.VERTICAL}>

                <Gtk.Label class={"sub-header"} label={tr("control_center.pages.bluetooth.adapters")} 
                  xalign={0} />
                <With value={adapters(adpts => adpts.length > 1)}>
                    {(hasMoreAdapters: boolean) => hasMoreAdapters &&
                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                            <For each={adapters}> 
                                {(adapter: AstalBluetooth.Adapter) => {
                                    const isSelected = createBinding(Bluetooth.getDefault(), "adapter")(a =>
                                        adapter.address === a?.address);

                                    return <PageButton class={isSelected(is => is ? "selected" : "")} 
                                      title={adapter.alias ?? "Adapter"} icon={"bluetooth-active-symbolic"} 
                                      description={createBinding(adapter, "address")}
                                      actionClicked={() => {
                                          if(adapter.address !== Bluetooth.getDefault().adapter?.address)
                                              Bluetooth.getDefault().adapter = adapter;
                                      }}
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
            <Gtk.Box class={"connections"} orientation={Gtk.Orientation.VERTICAL} hexpand
              spacing={2}>
                
                <Gtk.Box class={"paired"} orientation={Gtk.Orientation.VERTICAL} spacing={4}
                  visible={variableToBoolean(knownDevices)}>

                    <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} />
                    <For each={knownDevices}>
                        {(dev: AstalBluetooth.Device) => <DeviceWidget device={dev} />}
                    </For>
                </Gtk.Box>
                <Gtk.Box class={"discovered"} orientation={Gtk.Orientation.VERTICAL} spacing={4}
                  visible={variableToBoolean(discoveredDevices)}>

                    <Gtk.Label class={"sub-header"} label={tr("control_center.pages.bluetooth.new_devices")} 
                      xalign={0} />
                    <For each={discoveredDevices}>
                        {(dev: AstalBluetooth.Device) => <DeviceWidget device={dev} />}
                    </For>
                </Gtk.Box>
            </Gtk.Box>
        ];
    }}
/> as Page);

function DeviceWidget({ device }: { device: AstalBluetooth.Device }): Gtk.Widget {
    const statusWidget = <Gtk.Box spacing={6}>
        <Adw.Spinner visible={createBinding(device, "connecting")} />
        <Gtk.Box visible={createComputed([
              createBinding(device, "batteryPercentage"),
              createBinding(device, "connected")
          ])(([batt, connected]) => connected && (batt > -1))
        } spacing={4}>
            <Gtk.Label halign={Gtk.Align.END} label={
              createBinding(device, "batteryPercentage")(batt => 
                  `${Math.floor(batt * 100)}%`)
              } visible={createBinding(device, "connected")}
            />

            <Gtk.Image iconName={createBinding(device, "batteryPercentage")(batt => {
                  // peak mathematics
                  const iconName = `battery-level-${Math.round(batt * 10) * 10}-symbolic`;

                  return lookupIcon(iconName) ? iconName : "battery-missing-symbolic";
              })} visible={createBinding(device, "batteryPercentage")(b => b > 0)} 
            />
        </Gtk.Box>
    </Gtk.Box>;

    return <PageButton class={createBinding(device, "connected")(conn => 
      conn ? "selected" : "")} title={
          createBinding(device, "alias")(alias => alias ?? "Unknown Device")} 
        icon={createBinding(device, "icon")(ico => ico ?? "bluetooth-active-symbolic")}
        tooltipText={
            createBinding(device, "connected")(connected => 
                !connected ? tr("connect") : "")
        } actionClicked={() => {
            if(device.connected) return;

            Bluetooth.getDefault().pairDevice(device).then(() =>
                Bluetooth.getDefault().connectDevice(device).catch((e: Error) => {
                    Notifications.getDefault().sendNotification({
                        appName: "bluetooth",
                        summary: "Connection Error",
                        body: `An error occurred while attempting to connect to ${
                            device.alias ?? device.name}: ${e.message}`
                    });
                })
            ).catch((e: Error) => 
                Notifications.getDefault().sendNotification({
                    appName: "bluetooth",
                    summary: "Pairing Error",
                    body: `Couldn't pair with ${device.alias ?? device.name}: ${e.message}`,
                    urgency: AstalNotifd.Urgency.NORMAL
                })
            );
        }}
        endWidget={statusWidget}
        extraButtons={<With value={createComputed([
            createBinding(device, "connected"),
            createBinding(device, "trusted")
          ])}>
            {([connected, trusted]: [boolean, boolean]) =>
                <Gtk.Box visible={connected || trusted}>
                    <Gtk.Button iconName={connected ? "window-close-symbolic" : "user-trash-symbolic"}
                      tooltipText={tr(connected ? "disconnect" : "control_center.pages.bluetooth.unpair_device")}
                      onClicked={() => {
                          if(!connected) {
                              Bluetooth.getDefault().adapter?.remove_device(device);
                              return;
                          }

                          device.disconnect_device(null);
                      }}
                    />

                    <Gtk.Button iconName={trusted ? "shield-safe-symbolic" : "shield-danger-symbolic"}
                      tooltipText={tr(`control_center.pages.bluetooth.${trusted ? "un" : ""}trust_device`)}
                      onClicked={() => device.set_trusted(!trusted)}
                    />
                </Gtk.Box>
            }
        </With>} 
    /> as Gtk.Widget;
}


