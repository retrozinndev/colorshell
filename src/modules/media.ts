import { Accessor, createConnection } from "ags";
import { createScopedConnection, decoder } from "./utils";
import { gtype, property, register } from "ags/gobject";
import AstalMpris from "gi://AstalMpris";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "Media" })
class Media extends GObject.Object {
    declare $signals: Media.SignalSignatures;
    private static instance: Media;

    /** player connections */
    #players: Map<string, number> = new Map();

    @property(gtype<AstalMpris.Player|null>(AstalMpris.Player))
    player: AstalMpris.Player|null = null;

    constructor() {
        super();

        const mpris = AstalMpris.get_default();
        mpris.players.forEach(player => this.addConnections(player));
        this.selectBestPlayer();

        createScopedConnection(
            mpris,
            "player-added", 
            (player) => {
                this.addConnections(player);
                this.selectBestPlayer();
            }
        );

        createScopedConnection(
            mpris,
            "player-closed", (closedPlayer) => {
                this.removeConnections(closedPlayer);
                this.selectBestPlayer();
            }
        );
    }

    public addConnections(player: AstalMpris.Player): void {
        const connection = this.#players.get(player.busName);
        if(connection !== undefined)
            player.disconnect(connection);

        this.#players.set(player.busName,
            player.connect("notify::playback-status", () => {
                const status = player.get_playback_status();

                if(status === AstalMpris.PlaybackStatus.PLAYING) {
                    this.player = player;
                    return;
                }

                this.selectBestPlayer();
            })
        );
    }

    public removeConnections(player: AstalMpris.Player): void {
        const connection = this.#players.get(player.busName);

        if(connection === undefined)
            return;

        player.disconnect(connection);
        this.#players.delete(player.busName);
    }

    private selectBestPlayer(): void {
        const players = AstalMpris.get_default().players;
        const current = players.find(player => player.busName === this.player?.busName);
        const preferCurrent = (predicate: (player: AstalMpris.Player) => boolean) =>
            current && predicate(current) ? current : players.find(predicate);

        this.player = preferCurrent(player =>
            player.playbackStatus === AstalMpris.PlaybackStatus.PLAYING
        ) ?? preferCurrent(player =>
            player.playbackStatus !== AstalMpris.PlaybackStatus.STOPPED
        ) ??
            current ??
            players[0] ??
            null;
    }

    /** get the player that comes after the provided `player`. if there's no such player,
      * you get `undefined`.
      * 
      * @param allowLoop whether to allow looping around the list(running this for the last
      * player would return the first player in the list, if enabled. default: `true`)
      * @param list the list of `AstalMpris.Player` to lookup(by default we get them from `Mpris`)
      *
      * @returns the next `AstalMpris.Player` if found, or else, `undefined` */
    public getNextPlayer(player: AstalMpris.Player, allowLoop: boolean = true, list?: Array<AstalMpris.Player>): AstalMpris.Player|undefined {
        const players = list ?? AstalMpris.get_default().get_players();
        const i = players.findIndex(p => p.get_bus_name() === player.busName);

        // just in case
        if(i < 0)
            return undefined;

        if(i === players.length - 1) {
            const firstPlayer = players[0];
            if(firstPlayer && allowLoop && firstPlayer.busName !== player.busName)
                return firstPlayer;

            return undefined;
        }

        const nextPlayer: AstalMpris.Player|undefined = players[i+1];
        return nextPlayer;
    }

    /** get the previous `AstalMpris.Player` to `player`. if there's no such player,
      * you get `undefined`.
      * 
      * @param allowLoop whether to allow looping around the list(running this for the first
      * player would return the last player in the list, if enabled. default: `true`)
      * @param list the list of `AstalMpris.Player` to lookup(by default we get them from `Mpris`)
      *
      * @returns the previous `AstalMpris.Player` to `player`, if found; if not, `undefined` */
    public getPreviousPlayer(player: AstalMpris.Player, allowLoop: boolean = true, list?: Array<AstalMpris.Player>): AstalMpris.Player|undefined {
        const players = list ?? AstalMpris.get_default().get_players();
        const i = players.findIndex(p => p.get_bus_name() === player.busName);

        if(i < 0)
            return undefined;

        if(i === 0) {
            const lastPlayer = players[players.length-1];
            if(lastPlayer && allowLoop && lastPlayer.busName !== player.busName)
                return lastPlayer;

            return undefined;
        }

        const prevPlayer: AstalMpris.Player|undefined = players[i-1];
        return prevPlayer;
    }

    public static getDefault(): Media {
        if(!this.instance)
            this.instance = new Media();

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
        if(!player.available)
            return undefined;

        const meta = player.get_meta("xesam:url");
        const byteString = meta?.get_data_as_bytes();

        return byteString ? 
            decoder.decode(byteString.toArray())
        : undefined;
    }
}

namespace Media {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify::player": () => void;
    }
}

export default Media;
