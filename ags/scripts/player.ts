import { GObject, register, property } from "astal";
import AstalMpris from "gi://AstalMpris";

export { AstalPlayers };

@register({ GTypeName: "AstalPlayers" })
class AstalPlayers extends GObject.Object {
    private static astalMpris: AstalMpris.Mpris = AstalMpris.Mpris.get_default();
    private static inst: AstalPlayers;

    #players: AstalMpris.Player[] = [];
    #activePlayer: AstalMpris.Player | null = null;
    #playerConnections: Map<AstalMpris.Player, number[]> = new Map();

    @property(AstalMpris.Player)
    get activePlayer() {
        return this.#activePlayer;
    }

    constructor() {
        super();
        
        AstalPlayers.astalMpris.connect('player-added', (_, player) => this._addPlayer(player));
        AstalPlayers.astalMpris.connect('player-closed', (_, player) => this._removePlayer(player));

        this.#players = AstalPlayers.astalMpris.get_players();
        this.#players.forEach(player => this._addPlayerSignals(player));

        this._updateActivePlayer();
    }

    private _addPlayer(player: AstalMpris.Player) {
        if (this.#players.includes(player)) return;
        
        this.#players.push(player);
        this._addPlayerSignals(player);
        this._updateActivePlayer();
    }
    
    private _addPlayerSignals(player: AstalMpris.Player) {
        const handler = () => this._onPlayerStateChanged(player);

        const ids = [
            player.connect('notify::playback-status', handler),
            //player.connect('notify::cover-art', handler),
            player.connect('notify::identity', handler),
            //player.connect('notify::track-id', handler),
            // player.connect('notify::title', handler),
            // player.connect('notify::artist', handler),
            player.connect('notify::metadata', handler),
            player.connect('notify::position', handler)
        ];

        this.#playerConnections.set(player, ids);
    }
    
    private _removePlayer(player: AstalMpris.Player) {
        this.#players = this.#players.filter(p => p !== player);

        if (this.#playerConnections.has(player)) {
            const ids = this.#playerConnections.get(player)!;
            ids.forEach(id => player.disconnect(id));
            this.#playerConnections.delete(player);
        }

        this._updateActivePlayer();
    }

    private _onPlayerStateChanged(player: AstalMpris.Player) {
        const wasActivePlayer = this.#activePlayer;
        this._updateActivePlayer();

        if (this.#activePlayer === wasActivePlayer && this.#activePlayer === player) {
            this.notify('active-player');
        }
    }

    private _updateActivePlayer() {
        const playingPlayer = this.#players.find(p => p.playbackStatus === AstalMpris.PlaybackStatus.PLAYING);
        let newActivePlayer;

        if (playingPlayer) {
            newActivePlayer = playingPlayer;
        } else if (this.#activePlayer && this.#players.includes(this.#activePlayer)) {
            newActivePlayer = this.#activePlayer;
        } else {
            newActivePlayer = null;
        }

        if (this.#activePlayer !== newActivePlayer) {
            this.#activePlayer = newActivePlayer;
            this.notify('active-player');
        }
    }

    public static getDefault(): AstalPlayers {
        if (!AstalPlayers.inst) {
            AstalPlayers.inst = new AstalPlayers();
        }
        return AstalPlayers.inst;
    }

    public connect(signal: string, callback: (...args: any[]) => void): number {
        return super.connect(signal, callback);
    }

    public disconnect(id: number): void {
        super.disconnect(id);
    }
}
