import { timeout } from "ags/time";
import { execAsync } from "ags/process";
import { Astal, Gtk } from "ags/gtk4";
import { Clipboard } from "../../scripts/clipboard";
import { player, setPlayer } from "../bar/Media";
import { Accessor, createBinding, createConnection, For, With } from "ags";
import { getPlayerIconFromBusName, pathToURI } from "../../scripts/utils";

import AstalMpris from "gi://AstalMpris";
import AstalIO from "gi://AstalIO";
import Pango from "gi://Pango?version=1.0";


export const BigMedia = () => {
    let dragTimer: (AstalIO.Time|undefined);

    return <Gtk.Box class={"big-media"} orientation={Gtk.Orientation.VERTICAL} widthRequest={265}
      visible={player(pl => pl.available)}>

        <With value={player}>
            {(player: AstalMpris.Player) => player.available &&
                <Gtk.Box halign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>

                    <Gtk.Revealer hexpand={false} revealChild={
                        createBinding(player, "artUrl").as(Boolean)
                    } transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT} transitionDuration={300}>

                        <Gtk.Box class={"image"} css={createBinding(player, "artUrl").as((art) => 
                              `background-image: url("${pathToURI(art)}");`)} 
                          hexpand={false} vexpand={false} widthRequest={132} heightRequest={128}
                          valign={Gtk.Align.START} halign={Gtk.Align.CENTER}>

                            <PlayerSelectButton player={player} halign={Gtk.Align.END}
                              valign={Gtk.Align.END} />
                        </Gtk.Box>
                    </Gtk.Revealer>
                    
                    <Gtk.Box class={"info"} orientation={Gtk.Orientation.VERTICAL}
                      valign={Gtk.Align.CENTER} vexpand hexpand>

                        <Gtk.Label class={"title"} tooltipText={
                              createBinding(player, "title").as(title => title ?? "No Title")
                          } label={
                              createBinding(player, "title").as(title => title ?? "No Title")
                          } ellipsize={Pango.EllipsizeMode.END} maxWidthChars={25}
                        />
                        <Gtk.Label class={"artist"} tooltipText={
                              createBinding(player, "artist").as(artist => artist ?? "No Artist")
                          } label={
                              createBinding(player, "artist").as(artist => artist ?? "No Artist")
                          } ellipsize={Pango.EllipsizeMode.END} maxWidthChars={28} 
                        />
                    </Gtk.Box>

                    <Gtk.Box>
                        <With value={createBinding(player, "artUrl").as(Boolean)}>
                            {(hasAlbumArt) => !hasAlbumArt &&
                                <PlayerSelectButton player={player} reveal={true} 
                                  halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} 
                                />
                            }
                        </With>
                    </Gtk.Box>

                    <Gtk.Box class={"progress"} hexpand visible={createBinding(player, "canSeek")}>
                        <Astal.Slider hexpand max={createBinding(player, "length").as(Math.floor)}
                          value={createBinding(player, "position").as(Math.floor)}
                          onChangeValue={(_, type, value) => {
                              if(type === undefined || type === null) 
                                  return;

                              if(!dragTimer) {
                                  dragTimer = timeout(200, () => 
                                      player.position = Math.floor(value));

                                  return;
                              }

                              dragTimer.cancel(); 
                              dragTimer = timeout(200, () => 
                                  player.position = Math.floor(value));
                          }}
                        />
                    </Gtk.Box>
                    
                    <Gtk.CenterBox class={"bottom"} hexpand marginBottom={6}>
                        <Gtk.Label class={"elapsed"} xalign={0} yalign={0}
                          halign={Gtk.Align.START} label={createBinding(player, "position").as(pos => {
                              const sec = Math.floor(pos % 60);
                              return pos > 0 && player.length > 0 ? 
                                  `${Math.floor(pos / 60)}:${sec < 10 ? "0" : ""}${sec}`
                              : "0:00";
                          })} $type="start"
                        />

                        <Gtk.Box class={"controls button-row"} $type="center">
                            <Gtk.Button class={"link"} iconName={"edit-paste-symbolic"}
                              tooltipText={"Copy link to clipboard"}
                              onClicked={() => {
                                  execAsync(`playerctl --player=${
                                      player.busName.replace(/^org\.mpris\.MediaPlayer2\./i, "")
                                  } metadata xesam:url`).then(link => {
                                      Clipboard.getDefault().copyAsync(link);
                                  }).catch((e: Error) => {
                                      console.error(`Media: couldn't copy media link. Stderr: \n${e.message}\n${e.stack}`);
                                  });
                              }}
                            />
                            <Gtk.Button class={"shuffle"} visible={createBinding(player, "shuffleStatus").as(status =>
                                  status !== AstalMpris.Shuffle.UNSUPPORTED)} iconName={
                              createBinding(player, "shuffleStatus").as(status => status === AstalMpris.Shuffle.ON ? 
                                    "media-playlist-shuffle-symbolic"
                                : "media-playlist-consecutive-symbolic")} tooltipText={
                              createBinding(player, "shuffleStatus").as(status => status === AstalMpris.Shuffle.ON ? 
                                    "Shuffle"
                                : "No shuffle")} onClicked={() => player.shuffle()} 
                            />
                            <Gtk.Button class={"previous"} iconName={"media-skip-backward-symbolic"}
                              tooltipText={"Previous"} onClicked={() => player.canGoPrevious && player.previous()}
                            />
                            <Gtk.Button class={"play-pause"} tooltipText={
                              createBinding(player, "playbackStatus").as(status => 
                                  status === AstalMpris.PlaybackStatus.PLAYING ? "Pause" : "Play")}
                              iconName={createBinding(player, "playbackStatus").as(status => 
                                  status === AstalMpris.PlaybackStatus.PLAYING ? 
                                      "media-playback-pause-symbolic"
                                  : "media-playback-start-symbolic")} onClicked={() => player.play_pause()}
                            />
                            <Gtk.Button class={"next"} iconName={"media-skip-forward-symbolic"} 
                              tooltipText={"Next"} onClicked={() => player.canGoNext && player.next()}
                            />
                            <Gtk.Button class={"repeat"} iconName={createBinding(player, "loopStatus").as(status => {
                                  if(status === AstalMpris.Loop.TRACK)
                                      return "media-playlist-repeat-song-symbolic";

                                  if(status === AstalMpris.Loop.PLAYLIST)
                                      return "media-playlist-repeat-symbolic";

                                  return "loop-arrow-symbolic";
                              })} visible={createBinding(player, "loopStatus").as(status => 
                                  status !== AstalMpris.Loop.UNSUPPORTED)}
                              tooltipText={createBinding(player, "loopStatus").as(status => {
                                  if(status === AstalMpris.Loop.TRACK)
                                      return "Loop song";

                                  if(status === AstalMpris.Loop.PLAYLIST)
                                      return "Loop playlist";

                                  return "No loop";
                              })} onClicked={() => player.loop()}
                            />
                        </Gtk.Box>
                        <Gtk.Label class={"length"} xalign={1} yalign={0}
                          halign={Gtk.Align.END} label={createBinding(player, "length").as(len => { /* bananananananana */
                              const sec = Math.floor(len % 60);
                              return (len > 0 && Number.isFinite(len)) ? 
                                  `${Math.floor(len / 60)}:${sec < 10 ? "0" : ""}${sec}`
                              : "0:00";
                          })} $type="end"
                        />
                    </Gtk.CenterBox>
                </Gtk.Box>
            }
        </With>
    </Gtk.Box> as Gtk.Box;
}

export function PlayerSelectButton({ player, reveal, halign = Gtk.Align.CENTER, valign = Gtk.Align.CENTER }: {
    player: AstalMpris.Player, 
    reveal?: Accessor<boolean>|boolean,
    halign?: Gtk.Align;
    valign?: Gtk.Align;
}) {
    const availablePlayers = createBinding(AstalMpris.get_default(), "players").as(players =>
        players.filter(p => p.available));

    return <Gtk.Box vexpand={false} valign={valign} halign={halign}> 
        <With value={availablePlayers.as(apls => apls.length > 1)}>
            {(show: boolean) => show &&
                <Gtk.MenuButton halign={Gtk.Align.CENTER} hexpand
                  class={"player-select"} popover={
                    <Gtk.Popover class={"players-list"} hasArrow={false}>
                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
                            <For each={availablePlayers}>
                                {(pl: AstalMpris.Player) => 
                                    <Gtk.Button class={"player"} onClicked={() => setPlayer(pl)}>
                                        <Gtk.Box>
                                            <Gtk.Image iconName={createBinding(player, "busName").as(
                                                getPlayerIconFromBusName
                                            )} />
                                            <Gtk.Label label={createBinding(player, "identity")} 
                                              hexpand={false} class={"identity"} singleLineMode
                                              maxWidthChars={8}
                                            />
                                        </Gtk.Box>
                                    </Gtk.Button>
                                }
                            </For>
                        </Gtk.Box>
                    </Gtk.Popover> as Gtk.Popover
                  } $={(self) => {
                      const controllerMotion = Gtk.EventControllerMotion.new();
                      self.add_controller(controllerMotion);

                      self.set_child(
                          <Gtk.Box class={"player"}>
                              <Gtk.Image iconName={createBinding(player, "busName").as(
                                  getPlayerIconFromBusName)} 
                              />
                              <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
                                transitionDuration={280} revealChild={reveal ?? createConnection(false,
                                      [controllerMotion, "enter", () => {
                                          self.add_css_class("reveal");
                                          return true;
                                      }],
                                      [controllerMotion, "leave", () => {
                                          self.remove_css_class("reveal");
                                          return false;
                                      }]
                                  )
                                }>

                                  <Gtk.Box>
                                      <Gtk.Label label={createBinding(player, "identity")} 
                                        class={"identity"} maxWidthChars={6} 
                                        ellipsize={Pango.EllipsizeMode.END} 
                                        tooltipText={createBinding(player, "identity")}
                                      />
                                      <Gtk.Image iconName={
                                            createConnection("go-next-symbolic",
                                                [self.popover, "show", () => "go-down-symbolic"],
                                                [self.popover, "closed", () => "go-next-symbolic"]
                                            )
                                        } class={"arrow"} iconSize={Gtk.IconSize.NORMAL} 
                                      />
                                  </Gtk.Box>
                              </Gtk.Revealer>
                          </Gtk.Box> as Gtk.Box
                      );
                  }}
                />
            }
        </With>
    </Gtk.Box>;
}
