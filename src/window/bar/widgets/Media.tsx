import { createBinding, With } from "ags";
import { Gtk } from "ags/gtk4";
import { Separator } from "../../../widget/Separator";
import { Windows } from "../../../windows";
import { Clipboard } from "../../../modules/clipboard";
import { getPlayerIconFromBusName, secureBaseBinding, secureBinding, variableToBoolean } from "../../../modules/utils";
import { tr } from "../../../i18n/intl";
import { default as Player } from "../../../modules/media";

import AstalMpris from "gi://AstalMpris";
import Pango from "gi://Pango?version=1.0";


export const Media = () => 
    <Gtk.Box class={"media"} visible={createBinding(Player.getDefault(), "player").as(p => p.available)}>
        <Gtk.EventControllerScroll $={(self) => {
              self.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)
          }} onScroll={(_, __, dy) => {
              if(AstalMpris.get_default().players.length === 1 && 
                Player.getDefault().player.busName === AstalMpris.get_default().players[0].busName) 
                  return true;

              const players = AstalMpris.get_default().players;

              for(let i = 0; i < players.length; i++) {
                  const pl = players[i];

                  if(pl.busName !== Player.getDefault().player.busName) 
                      continue;

                  if(dy > 0 && players[i-1]) {
                      Player.getDefault().player = players[i-1];
                      break;
                  }

                  if(dy < 0 && players[i+1]) {
                      Player.getDefault().player = players[i+1];
                      break;
                  }
              }

              return true;
          }}
        />
        <Gtk.GestureClick onReleased={() => Windows.getDefault().toggle("center-window")} />
        <Gtk.EventControllerMotion onEnter={(self) => {
              const revealer = self.get_widget()!.get_last_child() as Gtk.Revealer;
              revealer.set_reveal_child(true);
          }} onLeave={(self) => {
              const revealer = self.get_widget()!.get_last_child() as Gtk.Revealer;
              revealer.set_reveal_child(false);
          }}
        />
        <Gtk.Box spacing={4} visible={createBinding(Player.getDefault(), "player")
          .as(p => p.available)}>

            <With value={createBinding(Player.getDefault(), "player")}>

                {(player: AstalMpris.Player) => player.available && <Gtk.Box>
                    <Gtk.Image class={"player-icon"} iconName={
                        secureBaseBinding<AstalMpris.Player>(createBinding(
                            Player.getDefault(), "player"
                        ), "busName", "org.MediaPlayer2.folder-music-symbolic").as(
                            getPlayerIconFromBusName
                        )} 
                    />
                    <Gtk.Label class={"title"} label={createBinding(
                            player, "title"
                        ).as(title => title ?? tr("media.no_title"))
                      } 
                      maxWidthChars={20} ellipsize={Pango.EllipsizeMode.END}
                    />
                    <Separator orientation={Gtk.Orientation.HORIZONTAL} size={1} margin={5}
                      alpha={.3} spacing={6} />
                    <Gtk.Label class={"artist"} label={createBinding(
                            player, "artist"
                        ).as(artist => artist ?? tr("media.no_artist"))
                      } 
                      maxWidthChars={18} ellipsize={Pango.EllipsizeMode.END}
                    />
                </Gtk.Box>}
            </With>
        </Gtk.Box>
        <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT} transitionDuration={260}
          revealChild={false}>

            <With value={createBinding(Player.getDefault(), "player")}>
                {(player: AstalMpris.Player) => player.available && <Gtk.Box class={"buttons"} spacing={4}>
                    <Gtk.Box class={"extra button-row"}>
                        <Gtk.Button class={"link"} iconName={"edit-paste-symbolic"} 
                          visible={variableToBoolean(Player.accessMediaUrl(Player.getDefault().player))}
                          tooltipText={tr("copy_to_clipboard")} onClicked={() => {
                              const url = Player.getMediaUrl(Player.getDefault().player);
                              url && Clipboard.getDefault().copyAsync(url);
                          }}
                        />
                    </Gtk.Box>
                    <Gtk.Box class={"media-controls button-row"}>
                        <Gtk.Button class={"previous"} iconName={"media-skip-backward-symbolic"}
                          visible={createBinding(player, "canGoPrevious")}
                          tooltipText={tr("media.previous")} onClicked={() => 
                              Player.getDefault().player.canGoPrevious && 
                                  Player.getDefault().player.previous()
                          }
                        />
                        <Gtk.Button class={"play-pause"} iconName={secureBinding(
                              player, "playbackStatus", AstalMpris.PlaybackStatus.PAUSED
                          ).as(status => status === AstalMpris.PlaybackStatus.PAUSED ? 
                                  "media-playback-start-symbolic"
                              : "media-playback-pause-symbolic"
                          )}
                          tooltipText={secureBinding(
                              player, "playbackStatus", AstalMpris.PlaybackStatus.PAUSED
                          ).as(status => status === AstalMpris.PlaybackStatus.PAUSED ? 
                              tr("media.play") : tr("media.pause")
                          )} onClicked={() => Player.getDefault().player.play_pause()}
                        />
                        <Gtk.Button class={"next"} iconName={"media-skip-forward-symbolic"}
                          visible={createBinding(player, "canGoNext")}
                          tooltipText={tr("media.next")} onClicked={() => Player.getDefault().player.canGoNext &&
                              Player.getDefault().player.next()}
                        />
                    </Gtk.Box>
                </Gtk.Box>}
            </With>
        </Gtk.Revealer>
    </Gtk.Box> as Gtk.Box;
