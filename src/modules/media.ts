import { createRoot, createState, onCleanup } from "ags";

import GObject from "ags/gobject";
import AstalMpris from "gi://AstalMpris";


export const dummyPlayer = {
    available: false,
    busName: "dummy_player",
    bus_name: "dummy_player"
} as AstalMpris.Player;

export let [player, setPlayer] = createState(dummyPlayer);

let disposeFun: undefined|(() => void);

export function initPlayer(): void {
    if(disposeFun) {
        console.error("Media: cannot initialize, there's already an instance");
        return;
    }

    createRoot((dispose) => {
        const connections = new Map<GObject.Object, Array<number>>();
        disposeFun = dispose;

        if(AstalMpris.get_default().players)
            setPlayer(AstalMpris.get_default().players[0]);

        connections.set(AstalMpris.get_default(), [
            AstalMpris.get_default().connect("player-added", (_, player) => 
                player.available && setPlayer(player)),

            AstalMpris.get_default().connect("player-closed", (_, closedPlayer) => {
                const players = AstalMpris.get_default().players.filter(pl => pl?.available && 
                    pl.busName !== closedPlayer.busName);

                if(players.length > 0 && players[0]) {
                    setPlayer(players[0]);
                    return;
                } 
                
                setPlayer(dummyPlayer);
            })
        ]);

        onCleanup(() => {
            connections.forEach((ids, obj) => 
                Array.isArray(ids) ?
                    ids.forEach(id => obj.disconnect(id))
                : obj.disconnect(ids)
            );
            disposeFun = undefined;
        });
    });
}

export function disposePlayer(): void {
    if(disposeFun) {
        disposeFun();
        return;
    }

    console.error("Media: Couldn't dispose player, there's no instance to dispose of");
}
