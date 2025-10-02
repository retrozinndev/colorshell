import { createBinding, For } from "ags";
import { register } from "ags/gobject";
import { Astal, Gtk } from "ags/gtk4";
import { Clipboard } from "../../../modules/clipboard";
import { accessMediaUrl } from "../../../modules/media";
import { player, setPlayer } from "../../../modules/media";
import { pathToURI, variableToBoolean } from "../../../modules/utils";
import { tr } from "../../../i18n/intl";

import AstalMpris from "gi://AstalMpris";
import Pango from "gi://Pango?version=1.0";
import Adw from "gi://Adw?version=1";
import GLib from "gi://GLib?version=2.0";


let dragTimer: (GLib.Source|undefined);

export const BigMedia = () => {
    const availablePlayers = createBinding(AstalMpris.get_default(), "players").as(pls => 
        pls.filter(p => p.available));

    const carousel = <Adw.Carousel orientation={Gtk.Orientation.HORIZONTAL} spacing={6} 
      onPageChanged={(self, num) => {
          const page = self.get_nth_page(num);
          if(page instanceof PlayerWidget && player.get().busName !== page.player.busName) 
              setPlayer(page.player);
    }}>
        <For each={availablePlayers.as(players => players.sort(pl => 
            pl.busName === player.get().busName ? -1 : 1))}>

            {(player: AstalMpris.Player) => <PlayerWidget player={player} />}
        </For>
    </Adw.Carousel> as Adw.Carousel;

    return <Gtk.Box class={"big-media"} orientation={Gtk.Orientation.VERTICAL} widthRequest={270}
      visible={variableToBoolean(availablePlayers)}>

        {carousel}
        <Gtk.Revealer revealChild={availablePlayers.as(pls => pls.length > 1)} transitionDuration={300}
          transitionType={Gtk.RevealerTransitionType.SLIDE_UP}>

            <Adw.CarouselIndicatorDots orientation={Gtk.Orientation.HORIZONTAL} carousel={carousel} />
        </Gtk.Revealer>
    </Gtk.Box> as Gtk.Box;
}

@register({ GTypeName: "PlayerWidget" })
class PlayerWidget extends Gtk.Box {
    #player!: AstalMpris.Player;
    #copyClickTimeout?: GLib.Source;

    get player() { return this.#player; }

    constructor({ player }: { player: AstalMpris.Player }) {
        super();

        this.setPlayer(player);
        this.set_orientation(Gtk.Orientation.VERTICAL);
        this.set_hexpand(true);

        this.append(
            <Gtk.Revealer hexpand={false} revealChild={
                createBinding(player, "coverArt").as(Boolean)
            } transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT} transitionDuration={300}>

                <Gtk.Box class={"image"} css={createBinding(player, "artUrl").as((art) => 
                      `background-image: url("${pathToURI(art)}");`)} 
                  hexpand={false} vexpand={false} widthRequest={132} heightRequest={128}
                  valign={Gtk.Align.START} halign={Gtk.Align.CENTER}
                />
            </Gtk.Revealer> as Gtk.Revealer
        );

        this.append(
            <Gtk.Box class={"info"} orientation={Gtk.Orientation.VERTICAL}
              valign={Gtk.Align.CENTER} vexpand hexpand>

                <Gtk.Label class={"title"} tooltipText={
                      createBinding(player, "title").as(title => title ?? tr("media.no_title"))
                  } label={
                      createBinding(player, "title").as(title => title ?? tr("media.no_title"))
                  } ellipsize={Pango.EllipsizeMode.END} maxWidthChars={25}
                />
                <Gtk.Label class={"artist"} tooltipText={
                      createBinding(player, "artist").as(artist => artist ?? tr("media.no_artist"))
                  } label={
                      createBinding(player, "artist").as(artist => artist ?? tr("media.no_artist"))
                  } ellipsize={Pango.EllipsizeMode.END} maxWidthChars={28} 
                />
            </Gtk.Box> as Gtk.Box
        );
        
        this.append(
            <Gtk.Box class={"progress"} hexpand visible={createBinding(player, "canSeek")}>
                <Astal.Slider hexpand max={createBinding(player, "length").as(Math.floor)}
                  value={createBinding(player, "position").as(Math.floor)}
                  onChangeValue={(_, type, value) => {
                      if(type === undefined || type === null) 
                          return;

                      if(!dragTimer) {
                          dragTimer = setTimeout(() => 
                              player.position = Math.floor(value)
                          , 200);

                          return;
                      }

                      dragTimer.destroy(); 
                      dragTimer = setTimeout(() => 
                          player.position = Math.floor(value)
                      , 200);
                  }}
                />
            </Gtk.Box> as Gtk.Box
        );

        this.append(
            <Gtk.CenterBox class={"bottom"} hexpand marginBottom={6}>
                <Gtk.Label class={"elapsed"} xalign={0} yalign={0}
                  halign={Gtk.Align.START} label={createBinding(player, "position").as(pos => {
                      const sec = Math.floor(pos % 60);
                      return pos > 0 && player.length > 0 ? 
                          `${Math.floor(pos / 60)}:${sec < 10 ? "0" : ""}${sec}`
                      : "0:00";
                  })} $type="start"
                />

                <Gtk.Box spacing={4} $type="center">
                    <Gtk.Box class={"extra button-row"}>
                        <Gtk.Button class={"link"}
                          tooltipText={tr("copy_to_clipboard")}
                          visible={variableToBoolean(accessMediaUrl(player))}
                          onClicked={(self) => {
                              const url = accessMediaUrl(player).get();
                              // a widget that supports adding multiple icons and allows switching
                              // through them would be pretty nice!! (i'll probably do this later)
                              url &&
                                  Clipboard.getDefault().copyAsync(url).then(() => {
                                      if(this.#copyClickTimeout && !this.#copyClickTimeout.is_destroyed()) 
                                          this.#copyClickTimeout.destroy();

                                      (self.get_child() as Gtk.Stack).set_visible_child_name("done-icon");
                                      this.#copyClickTimeout = setTimeout(() => {
                                          (self.get_child() as Gtk.Stack).set_visible_child_name("copy-icon");
                                          this.#copyClickTimeout!.destroy();
                                          this.#copyClickTimeout = undefined;
                                      }, 1100);
                                  }).catch(() => {
                                      if(this.#copyClickTimeout && !this.#copyClickTimeout.is_destroyed()) 
                                          this.#copyClickTimeout.destroy();

                                      (self.get_child() as Gtk.Stack).set_visible_child_name("error-icon");
                                      this.#copyClickTimeout = setTimeout(() => {
                                          (self.get_child() as Gtk.Stack).set_visible_child_name("copy-icon");
                                          this.#copyClickTimeout!.destroy();
                                          this.#copyClickTimeout = undefined;
                                      }, 900);
                                  });
                          }}>
                            
                            <Gtk.Stack transitionType={Gtk.StackTransitionType.CROSSFADE} 
                              transitionDuration={340}>

                                <Gtk.StackPage name={"copy-icon"} child={
                                    <Gtk.Image iconName={"edit-paste-symbolic"} /> as Gtk.Widget
                                } />
                                <Gtk.StackPage name={"done-icon"} child={
                                    <Gtk.Image iconName={"object-select-symbolic"} /> as Gtk.Widget
                                } />
                                <Gtk.StackPage name={"error-icon"} child={
                                    <Gtk.Image iconName={"window-close-symbolic"} /> as Gtk.Widget
                                } />
                            </Gtk.Stack>
                        </Gtk.Button>
                    </Gtk.Box>
                    <Gtk.Box class={"media-controls button-row"}>
                        <Gtk.Button class={"shuffle"} visible={createBinding(player, "shuffleStatus").as(status =>
                              status !== AstalMpris.Shuffle.UNSUPPORTED)} iconName={
                          createBinding(player, "shuffleStatus").as(status => status === AstalMpris.Shuffle.ON ? 
                                "media-playlist-shuffle-symbolic"
                            : "media-playlist-consecutive-symbolic")} tooltipText={
                          createBinding(player, "shuffleStatus").as(status => status === AstalMpris.Shuffle.ON ? 
                                tr("media.shuffle")
                            : tr("media.follow_order"))} onClicked={() => player.shuffle()} 
                        />
                        <Gtk.Button class={"previous"} iconName={"media-skip-backward-symbolic"}
                          tooltipText={tr("media.previous")} onClicked={() => player.canGoPrevious && player.previous()}
                        />
                        <Gtk.Button class={"play-pause"} tooltipText={
                          createBinding(player, "playbackStatus").as(status => 
                              status === AstalMpris.PlaybackStatus.PLAYING ? tr("media.pause") : tr("media.play"))}
                          iconName={createBinding(player, "playbackStatus").as(status => 
                              status === AstalMpris.PlaybackStatus.PLAYING ? 
                                  "media-playback-pause-symbolic"
                              : "media-playback-start-symbolic")} onClicked={() => player.play_pause()}
                        />
                        <Gtk.Button class={"next"} iconName={"media-skip-forward-symbolic"} 
                          tooltipText={tr("media.next")} onClicked={() => player.canGoNext && player.next()}
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
                                  return tr("media.song_loop");

                              if(status === AstalMpris.Loop.PLAYLIST)
                                  return tr("media.loop");

                              return tr("media.no_loop");
                          })} onClicked={() => player.loop()}
                        />
                    </Gtk.Box>
                </Gtk.Box>
                <Gtk.Label class={"length"} xalign={1} yalign={0}
                  halign={Gtk.Align.END} label={createBinding(player, "length").as(len => { /* bananananananana */
                      const sec = Math.floor(len % 60);
                      return (len > 0 && Number.isFinite(len)) ? 
                          `${Math.floor(len / 60)}:${sec < 10 ? "0" : ""}${sec}`
                      : "0:00";
                  })} $type="end"
                />
            </Gtk.CenterBox> as Gtk.CenterBox
        );
    }

    setPlayer(player: AstalMpris.Player) {
        this.#player = player;
    }
}
