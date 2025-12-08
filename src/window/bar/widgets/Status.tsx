import { Gtk } from "ags/gtk4";
import { Wireplumber } from "../../../modules/volume";
import { Battery } from "../../../modules/battery";
import { Notifications } from "../../../modules/notifications";
import { Windows } from "../../../windows";
import { Recording } from "../../../modules/recording";
import { Accessor, createBinding, createComputed, With } from "ags";
import { variableToBoolean } from "../../../modules/utils";
import { Bluetooth } from "../../../modules/bluetooth";

import GObject from "ags/gobject";
import AstalBluetooth from "gi://AstalBluetooth";
import AstalNetwork from "gi://AstalNetwork";
import AstalWp from "gi://AstalWp";


export const Status = () =>
  <Gtk.Button class={createBinding(Windows.getDefault(), "openWindows").as((openWins) =>
      openWins.includes("control-center") ? 
          "open status"
      : "status"
    )} onClicked={() => Windows.getDefault().toggle("control-center")}>

      <Gtk.Box>
        <Gtk.Box class={"volume-indicators"} spacing={5}>
          <BatteryStatus
            visible={Battery.getDefault().bindHasBattery()}
            class="battery"
            icon={Battery.getDefault().bindIcon()}
            percentage={Battery.getDefault().bindPercentage()}
          ></BatteryStatus>
          <VolumeStatus
            class="sink"
            endpoint={Wireplumber.getDefault().getDefaultSink()}
            icon={createBinding(
              Wireplumber.getDefault().getDefaultSink(),
              "volumeIcon"
            ).as((icon) =>
              !Wireplumber.getDefault().isMutedSink() &&
              Wireplumber.getDefault().getSinkVolume() > 0
                ? icon
                : "audio-volume-muted-symbolic"
            )}
          />

          <VolumeStatus
            class="source"
            endpoint={Wireplumber.getDefault().getDefaultSource()}
            icon={createBinding(
              Wireplumber.getDefault().getDefaultSource(),
              "volumeIcon"
            ).as((icon) =>
              !Wireplumber.getDefault().isMutedSource() &&
              Wireplumber.getDefault().getSourceVolume() > 0
                ? icon
                : "microphone-sensitivity-muted-symbolic"
            )}
          />
        </Gtk.Box>
        <Gtk.Revealer revealChild={createBinding(Recording.getDefault(), "recording")}
          transitionDuration={500} transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}>

            <Gtk.Box>
                <Gtk.Image class={"recording state"} iconName={"media-record-symbolic"}
                  css={"margin-right: 6px;"}
                />
                <Gtk.Label label={createBinding(Recording.getDefault(), "recordingTime")}
                  class={"rec-time"}
                />
            </Gtk.Box>
        </Gtk.Revealer>
        <StatusIcons />
    </Gtk.Box>
</Gtk.Button> as Gtk.Button;

function VolumeStatus(props: {
  class?: string;
  endpoint: AstalWp.Endpoint;
  icon?: string | Accessor<string>;
}) {
  return (
    <Gtk.Box
      spacing={2}
      class={props.class}
      $={(self) => {
        const conns: Map<GObject.Object, number> = new Map();
        const controllerScroll = Gtk.EventControllerScroll.new(
          Gtk.EventControllerScrollFlags.VERTICAL |
            Gtk.EventControllerScrollFlags.KINETIC
        );

        conns.set(
          controllerScroll,
          controllerScroll.connect("scroll", (_, _dx, dy) => {
            console.log`Scrolled! dx: ${_dx}; dy: ${dy}`;
            dy > 0
              ? Wireplumber.getDefault().decreaseEndpointVolume(
                  props.endpoint,
                  5
                )
              : Wireplumber.getDefault().increaseEndpointVolume(
                  props.endpoint,
                  5
                );

            return true;
          })
        );

        conns.set(
          self,
          self.connect("destroy", () =>
            conns.forEach((id, obj) => obj.disconnect(id))
          )
        );
      }}
    >
      {props.icon && <Gtk.Image iconName={props.icon} />}
      <Gtk.Label
        class={"volume"}
        label={createBinding(props.endpoint, "volume").as(
          (vol) => `${Math.floor(vol * 100)}%`
        )}
      />
    </Gtk.Box>
  ) as Gtk.Box;
}

function BatteryStatus(props: {
  visible?: Accessor<boolean>;
  class?: string;
  percentage?: Accessor<string>;
  icon?: string | Accessor<string>;
}) {
  return (
    <Gtk.Box visible={props.visible} spacing={2} class={props.class}>
      {props.icon && <Gtk.Image iconName={props.icon} />}
      <Gtk.Label class={"level"} label={props.percentage} />
    </Gtk.Box>
  ) as Gtk.Box;
}

function StatusIcons() {
  return (
    <Gtk.Box class={"status-icons"} spacing={8}>
      <Gtk.Image
        iconName={createComputed(
          [
            createBinding(AstalBluetooth.get_default(), "isPowered"),
            createBinding(AstalBluetooth.get_default(), "isConnected"),
          ],
          (powered, connected) => {
            return powered
              ? connected
                ? "bluetooth-active-symbolic"
                : "bluetooth-symbolic"
              : "bluetooth-disabled-symbolic";
          }
        )}
        class={"bluetooth state"}
        visible={createBinding(Bluetooth.getDefault(), "adapter").as(Boolean)}
      />

      <Gtk.Box
        visible={createBinding(AstalNetwork.get_default(), "primary").as(
          (primary) => primary !== AstalNetwork.Primary.UNKNOWN
        )}
      >
        <With value={createBinding(AstalNetwork.get_default(), "primary")}>
          {(primary: AstalNetwork.Primary) => {
            let device: AstalNetwork.Wifi | AstalNetwork.Wired;
            switch (primary) {
              case AstalNetwork.Primary.WIRED:
                device = AstalNetwork.get_default().wired;
                break;
              case AstalNetwork.Primary.WIFI:
                device = AstalNetwork.get_default().wifi;
                break;

              default:
                return <Gtk.Image iconName={"network-no-route-symbolic"} />;
            }

            return <Gtk.Image iconName={createBinding(device, "iconName")} />;
          }}
        </With>
      </Gtk.Box>

      <Gtk.Box>
        <Gtk.Image
          class={"bell state"}
          iconName={createBinding(
            Notifications.getDefault().getNotifd(),
            "dontDisturb"
          ).as((dnd) =>
            dnd
              ? "minus-circle-filled-symbolic"
              : "preferences-system-notifications-symbolic"
          )}
        />
        <Gtk.Image
          iconName={"circle-filled-symbolic"}
          class={"notification-count"}
          visible={variableToBoolean(
            createBinding(Notifications.getDefault(), "history")
          )}
        />
      </Gtk.Box>
    </Gtk.Box>
  );
}
