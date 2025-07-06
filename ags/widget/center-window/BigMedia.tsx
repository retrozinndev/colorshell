import { timeout } from "ags/time";
import { execAsync } from "ags/process";
import { Astal, Gtk } from "ags/gtk4";
import { Clipboard } from "../../scripts/clipboard";
import { player } from "../bar/Media";
import { createBinding, With } from "ags";

import AstalMpris from "gi://AstalMpris";
import AstalIO from "gi://AstalIO";
import Gio from "gi://Gio?version=2.0";
import Pango from "gi://Pango?version=1.0";


export const BigMedia = () => {
    let dragTimer: (AstalIO.Time|undefined);

    return <Gtk.Box class={"big-media"} orientation={Gtk.Orientation.VERTICAL} widthRequest={250}
      visible={player(pl => pl.available)}>

        <With value={player}>
            {(player: AstalMpris.Player) => player.available &&
                <Gtk.Box halign={Gtk.Align.CENTER} $={(self) => {
                      const artSub = createBinding(player, "artUrl").subscribe(() => {
                          const firstChild = self.get_first_child();
                          const albumArt = getAlbumArt(player);

                          if(!albumArt) {
                              if(firstChild instanceof Gtk.Picture)
                                  self.remove(firstChild);

                              return;
                          }

                          if(firstChild instanceof Gtk.Picture) {
                              firstChild.set_filename(albumArt);
                              return;
                          }

                          self.prepend(
                              <Gtk.Picture file={Gio.File.new_for_path(albumArt)} 
                                hexpand={false} vexpand={false} marginTop={6}
                                widthRequest={132} heightRequest={128}
                              /> as Gtk.Picture
                          );
                      });

                      const destroyId = self.connect("destroy", () => {
                          self.disconnect(destroyId);
                          artSub();
                      });
                  }}>

                    <Gtk.Box class={"info"} orientation={Gtk.Orientation.VERTICAL}
                      valign={Gtk.Align.CENTER} vexpand={true}>

                        <Gtk.Label class={"title"} tooltipText={
                              createBinding(player, "title").as(title => title ?? "No Title")
                          } ellipsize={Pango.EllipsizeMode.END} maxWidthChars={25}
                        />
                        <Gtk.Label class={"artist"} tooltipText={
                              createBinding(player, "artist").as(artist => artist ?? "No Artist")
                          } ellipsize={Pango.EllipsizeMode.END} maxWidthChars={28} 
                        />
                    </Gtk.Box>

                    <Gtk.Box class={"progress"} hexpand={true} visible={createBinding(player, "canSeek")}>
                        <Astal.Slider hexpand={true} max={createBinding(player, "length").as(Math.floor)}
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
                    
                    <Gtk.CenterBox class={"bottom"} hexpand={true} marginBottom={6}>
                        <Gtk.Label class={"elapsed"} valign={Gtk.Align.START} halign={Gtk.Align.START} 
                          label={createBinding(player, "position").as(pos => {
                              const sec = Math.floor(pos % 60);
                              return pos > 0 && player.length > 0 ? 
                                  `${Math.floor(pos / 60)}:${sec < 10 ? "0" : ""}${sec}`
                              : "0:00";
                          })}
                        />

                        <Gtk.Box class={"controls button-row"}>
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
                                : "No shuffle")} onClicked={player.shuffle} 
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
                                  : "media-playback-start-symbolic")} onClicked={player.play_pause}
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
                              })} onClicked={player.loop}
                            />
                        </Gtk.Box>
                        <Gtk.Label class={"length"} valign={Gtk.Align.START} halign={Gtk.Align.END}
                          label={createBinding(player, "length").as(len => { /* bananananananana */
                              const sec = Math.floor(len % 60);
                              return (len > 0 && Number.isFinite(len)) ? 
                                  `${Math.floor(len / 60)}:${sec < 10 ? "0" : ""}${sec}`
                              : "0:00";
                          })}
                        />
                    </Gtk.CenterBox>
                </Gtk.Box>
            }
        </With>
    </Gtk.Box> as Gtk.Box;
}

/**
 * This function handles album art/cover of playing media. If a file is provided
 * by the player, it adds the "file://" uri as a prefix, so you can use it in css.
 *
 * @param player the player you want to pull album art from
 * @returns Binding to player.artUrl containing the album art uri, or an undefined binding ig none was found.
* */
function getAlbumArt(player: AstalMpris.Player): string|undefined {
    const artUrl = player.artUrl;

    if(!artUrl) 
        return undefined;

    if(artUrl.startsWith("/")) 
        return "file://" + artUrl;

    return artUrl;
}
