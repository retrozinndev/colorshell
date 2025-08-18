import { createBinding, onCleanup, With } from "ags";
import { Gtk } from "ags/gtk4";
import { Separator } from "../Separator";
import { Windows } from "../../windows";
import { Clipboard } from "../../modules/clipboard";
import { getPlayerIconFromBusName, variableToBoolean } from "../../modules/utils";
import { accessMediaUrl, player, setPlayer } from "../../modules/media";

import GObject from "ags/gobject";
import AstalMpris from "gi://AstalMpris";
import Pango from "gi://Pango?version=1.0";


export const Media = () => {
    const connections: Map<GObject.Object, Array<number>|number> = new Map();

    onCleanup(() => connections.forEach((id, obj) => 
        Array.isArray(id) ? 
            id.forEach(id => obj.disconnect(id))
        : obj.disconnect(id)
    ));

    return <Gtk.Box class={"media"} visible={player((pl) => pl.available)}
      $={(self) => {
          const gestureClick = Gtk.GestureClick.new(),
              controllerMotion = Gtk.EventControllerMotion.new(),
              controllerScroll = Gtk.EventControllerScroll.new(
                  Gtk.EventControllerScrollFlags.VERTICAL
              );

          self.add_controller(gestureClick);
          self.add_controller(controllerMotion);
          self.add_controller(controllerScroll);

          connections.set(gestureClick, gestureClick.connect("released", () =>
              Windows.getDefault().toggle("center-window")));

          connections.set(controllerScroll, 
              controllerScroll.connect("scroll", (_, _dx, dy) => {
                  if(AstalMpris.get_default().players.length === 1 && 
                     player.get()?.busName === AstalMpris.get_default().players[0].busName) 
                      return true;

                  const players = AstalMpris.get_default().players;

                  for(let i = 0; i < players.length; i++) {
                      const pl = players[i];

                      if(pl.busName !== player.get().busName) 
                          continue;

                      if(dy > 0 && players[i-1]) {
                          setPlayer(players[i-1]);
                          break;
                      }

                      if(dy < 0 && players[i+1]) {
                          setPlayer(players[i+1]);
                          break;
                      }
                  }

                  return true;
              })
          );

          connections.set(controllerMotion, [
              controllerMotion.connect("enter", () => {
                  const revealer = self.get_last_child() as Gtk.Revealer;
                  revealer.set_reveal_child(true);
              }),
              controllerMotion.connect("leave", () => {
                  const revealer = self.get_last_child() as Gtk.Revealer;
                  revealer.set_reveal_child(false);
              })
          ]);

          connections.set(self, self.connect("destroy", () => 
              connections.forEach((ids, obj) => Array.isArray(ids) ?
                  ids.forEach(id => obj.disconnect(id))
              : obj.disconnect(ids))
          ));
      }}>

        <Gtk.Box spacing={4} visible={player(pl => pl.available)}>
            <With value={player(pl => pl.available)}>
                {(available: boolean) => available && <Gtk.Box>
                    <Gtk.Image class={"player-icon"} iconName={
                        createBinding(player.get(), "busName").as(getPlayerIconFromBusName)} 
                    />
                    <Gtk.Label class={"title"} label={createBinding(player.get(), "title").as(title =>
                        title ?? "No Title")} maxWidthChars={20} ellipsize={Pango.EllipsizeMode.END}
                    />
                    <Separator orientation={Gtk.Orientation.HORIZONTAL} size={1} margin={5}
                      alpha={.3} spacing={6} />
                    <Gtk.Label class={"artist"} label={createBinding(player.get(), "artist").as(artist =>
                        artist ?? "No Artist")} maxWidthChars={18} ellipsize={Pango.EllipsizeMode.END}
                    />
                </Gtk.Box>}
            </With>
        </Gtk.Box>
        <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT} transitionDuration={260}
          revealChild={false}>

            <With value={player(pl => pl.available)}>
                {(available: boolean) => available && <Gtk.Box class={"media-controls button-row"}>
                    <Gtk.Button class={"link"} iconName={"edit-paste-symbolic"} 
                      visible={variableToBoolean(accessMediaUrl(player.get()))}
                      tooltipText={"Copy link to Clipboard"} onClicked={() => {
                          const url = accessMediaUrl(player.get()).get();
                          url && Clipboard.getDefault().copyAsync(url);
                      }}
                    />
                    <Gtk.Button class={"previous"} iconName={"media-skip-backward-symbolic"}
                      tooltipText={"Previous"} onClicked={() => 
                          player.get().canGoPrevious && player.get().previous()}
                    />
                    <Gtk.Button class={"play-pause"} iconName={createBinding(player.get(), "playbackStatus").as(status =>
                        status === AstalMpris.PlaybackStatus.PAUSED ? 
                            "media-playback-start-symbolic"
                        : "media-playback-pause-symbolic")}
                      tooltipText={
                          createBinding(player.get(), "playbackStatus").as(status =>
                              status === AstalMpris.PlaybackStatus.PAUSED ? "Play" : "Pause")
                      } onClicked={() => player.get().play_pause()}
                    />
                    <Gtk.Button class={"next"} iconName={"media-skip-forward-symbolic"}
                      tooltipText={"Next"} onClicked={() => player.get().canGoNext &&
                          player.get().next()}
                    />
                </Gtk.Box>}
            </With>
        </Gtk.Revealer>
    </Gtk.Box>
}
