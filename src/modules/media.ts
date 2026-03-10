import { Accessor, createConnection, getScope, Scope } from "ags";
import { createScopedConnection, decoder } from "./utils";

import AstalMpris from "gi://AstalMpris";
import GObject from "gi://GObject?version=2.0";
import { property, register } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "Media" })
export default class Media extends GObject.Object {
    private static instance: Media;
    public static readonly dummyPlayer = {
        available: false,
        busName: "dummy_player",
        bus_name: "dummy_player"
    } as AstalMpris.Player;

    @property(AstalMpris.Player)
    player: AstalMpris.Player = Media.dummyPlayer;

    constructor(scope: Scope) {
        super();
        
        scope.run(() => {
            const firstPlayer = AstalMpris.get_default().players[0];
            if(firstPlayer) 
                this.player = firstPlayer;

            createScopedConnection(
                AstalMpris.get_default(), 
                "player-added", 
                (player) => {
                    if(player.available) 
                        this.player = player;
                }
            );

            createScopedConnection(
                AstalMpris.get_default(),
                "player-closed", (closedPlayer) => {
                    const players = AstalMpris.get_default().players.filter(pl => pl?.available && 
                        pl.busName !== closedPlayer.busName);

                    // go back to first player(if available) when the active player is closed
                    if(players.length > 0 && players[0]) {
                        this.player = players[0];
                        return;
                    } 
                    
                    this.player = Media.dummyPlayer;
                }
            );
        });
    }

    public static getDefault(): Media {
        if(!this.instance)
            this.instance = new Media(getScope());

        return this.instance;
    }

    public static accessMediaUrl(player: AstalMpris.Player): Accessor<string|undefined> {
        return createConnection(player.get_meta("xesam:url"),
            [player, "notify::metadata", () => player.get_meta("xesam:url")]
        ).as(url => {
            const byteString = url?.get_data_as_bytes();

            return byteString ? 
                decoder.decode(byteString.toArray())
            : undefined;
          })
    }

    public static async playerSeek(player: AstalMpris.Player, position: number): Promise<void> {
        if(!player.canSeek)
            return;


        position = position < 0 ? 0 : Math.floor((position * 1000000)); // to microseconds
        const trackID = player.get_meta("mpris:trackid");

        if(trackID && trackID.get_string()?.[0].startsWith('/')) {
            player.set_position(position);
            return;
        }

        const name = player.busName;
        const cancellable = Gio.Cancellable.new();

        return new Promise((resolve, reject) => {
            const id = cancellable.connect(() => {
                cancellable.disconnect(id);
                reject(new Error("Couldn't get Session Bus: Operation was cancelled"));
            });

            Gio.DBus.get(Gio.BusType.SESSION, cancellable, (_, res) => {
                let bus!: Gio.DBusConnection;
                try {
                    bus = Gio.DBus.get_finish(res);
                } catch(e) {
                    reject(e);
                    return;
                }

                bus.call(
                    name,
                    "/org/mpris/MediaPlayer2",
                    "org.mpris.MediaPlayer2.Player",
                    "SetPosition",
                    GLib.Variant.new("(ox)", ["/", position]),
                    null,
                    Gio.DBusCallFlags.NONE,
                    3000,
                    null,
                    () => resolve()
                );
            });
        });
    }

    
    public static getMediaUrl(player: AstalMpris.Player): string|undefined {
        if(!player.available) return;

        const meta = player.get_meta("xesam:url");
        const byteString = meta?.get_data_as_bytes();

        return byteString ? 
            decoder.decode(byteString.toArray())
        : undefined;
    }
}
