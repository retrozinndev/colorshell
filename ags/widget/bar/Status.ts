import AstalBluetooth from "gi://AstalBluetooth";
import AstalNetwork from "gi://AstalNetwork";
import AstalWp from "gi://AstalWp";

import { bind, Binding, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../../scripts/volume";
import { Notifications } from "../../scripts/notifications";
import { Windows } from "../../windows";
import { Recording } from "../../scripts/recording";
import { getDateTime } from "../../scripts/time";
import { tr } from "../../i18n/intl";


export function Status(): Gtk.Widget {
    return new Widget.EventBox({
        className: bind(Windows, "openWindows").as((openWins) => 
            Object.hasOwn(openWins, "control-center") ? "open status" : "status"),
        onClick: () => Windows.toggle("control-center"),
        child: new Widget.Box({
            children: [
                volumeStatus({
                    className: "sink",
                    endpoint: Wireplumber.getDefault().getDefaultSink(),
                    icon: bind(Wireplumber.getDefault().getDefaultSink(), "volumeIcon").as(icon => 
                        !Wireplumber.getDefault().isMutedSink() && Wireplumber.getDefault().getSinkVolume() > 0 ? icon : "audio-volume-muted-symbolic"),
                }),
                volumeStatus({
                    className: "source",
                    endpoint: Wireplumber.getDefault().getDefaultSource(),
                    icon: bind(Wireplumber.getDefault().getDefaultSource(), "volumeIcon").as(icon => 
                        !Wireplumber.getDefault().isMutedSource() && Wireplumber.getDefault().getSourceVolume() > 0 ? icon : "microphone-sensitivity-muted-symbolic"),
                }),
                StatusIcons()
            ]
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}

function volumeStatus(props: { className?: string, endpoint: AstalWp.Endpoint, icon?: (string|Binding<string>) }): Gtk.Widget {
    return new Widget.EventBox({
        className: props.className,
        onScroll: (_, event) => 
            event.delta_y > 0 ?
                Wireplumber.getDefault().decreaseEndpointVolume(props.endpoint, 5)
            :
                Wireplumber.getDefault().increaseEndpointVolume(props.endpoint, 5),
            child: new Widget.Box({
                children: [
                    new Widget.Label({
                        className: "nf",
                        visible: props.icon,
                        label: props.icon,
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "volume",
                        label: bind(props.endpoint, "volume").as((volume: number) => 
                            Math.floor(volume * 100) + "%")
                    } as Widget.LabelProps),
                ]
            } as Widget.BoxProps)
    } as Widget.EventBoxProps)
}

function StatusIcons(): Gtk.Widget {
    const bluetoothIcon: Variable<string> = Variable.derive([
        bind(AstalBluetooth.get_default(), "isPowered"),
        bind(AstalBluetooth.get_default(), "isConnected")
    ], (powered, connected) => {
        return powered ? (
            connected ? "󰂱"
            : "󰂯"
        ) : "󰂲"
    });

    const networkIcon: Variable<string> = Variable.derive([
        bind(AstalNetwork.get_default(), "primary"),
        bind(AstalNetwork.get_default(), "wired"),
        bind(AstalNetwork.get_default(), "wifi")
    ],
    (primary, wired, wifi) => {
        switch(primary) {
            case AstalNetwork.Primary.WIRED: return wired ? 
                    "󰛳"
                : "󰛵";

            case AstalNetwork.Primary.WIFI: return wifi ?
                    "󰤨"
                : "󰤭";
        }

        return "󰲊";
    });

    const recordingTimer: Variable<string> = Variable.derive([
        bind(Recording.getDefault(), "recording"),
        getDateTime()
    ], (recording, dateTime) => {
        if(!recording || !Recording.getDefault().startedAt) 
            return "...";

        const startedAtSeconds = dateTime.to_unix() - Recording.getDefault().startedAt!.to_unix();
        if(startedAtSeconds <= 0) return "00:00";

        const hours = Math.floor(startedAtSeconds / 120);
        const minutes = Math.floor(startedAtSeconds / 60);
        const seconds = Math.floor(startedAtSeconds % 60);

        return `${ hours > 0 ? `${hours < 10 ? `0${hours}` : hours }:` : ""
            }${ minutes < 10 ? `0${minutes}` : minutes 
            }:${ seconds < 10 ? `0${seconds}` : seconds }`;
    });

    return new Widget.Box({
        className: "status-icons",
        spacing: 3,
        children: [
            new Widget.Revealer({
                revealChild: bind(Recording.getDefault(), "recording"),
                transitionDuration: 500,
                transitionType: Gtk.RevealerTransitionType.SLIDE_LEFT,
                onDestroy: () => recordingTimer.drop(),
                child: new Widget.EventBox({
                    onClick: () => Recording.getDefault().recording &&
                        Recording.getDefault().stopRecording(),
                    tooltipText: tr("control_center.tiles.recording.enabled_desc"),
                    child: new Widget.Box({
                        children: [
                            new Widget.Label({
                                className: "recording nf state",
                                label: '󰻃'
                            } as Widget.LabelProps),
                            new Widget.Label({
                                className: "rec-time",
                                label: recordingTimer()
                            } as Widget.LabelProps)
                        ]
                    } as Widget.BoxProps)
                } as Widget.EventBoxProps)
            } as Widget.RevealerProps),
            new Widget.Label({
                className: "bluetooth nf state",
                visible: bind(AstalBluetooth.get_default(), "adapter").as(Boolean),
                label: bluetoothIcon(),
                onDestroy: () => bluetoothIcon.drop()
            } as Widget.LabelProps),
            new Widget.Label({
                className: "network nf state",
                label: networkIcon(),
                onDestroy: () => networkIcon.drop()
            } as Widget.LabelProps),
            new Widget.Box({
                children: [
                    new Widget.Label({
                        className: "bell nf state",
                        label: bind(Notifications.getDefault().getNotifd(), "dontDisturb").as((dnd: boolean) => 
                            dnd ? "󰂠" : "󰂚")
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "notification-count nf",
                        xalign: 0,
                        yalign: 0.25,
                        visible: bind(Notifications.getDefault(), "history").as(history => 
                            history.length > 0),
                        label: '󰧞'
                    } as Widget.LabelProps)
                ]
            } as Widget.BoxProps)
        ]
    } as Widget.BoxProps);
}
