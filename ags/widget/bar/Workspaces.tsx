import { Gtk } from "ags/gtk4";
import AstalHyprland from "gi://AstalHyprland";
import { getAppIcon, getSymbolicIcon } from "../../scripts/apps";
import { Config } from "../../scripts/config";
import { Separator } from "../Separator";
import { createBinding, createComputed, createState, For, With } from "ags";
import GObject from "gi://GObject?version=2.0";
import { variableToBoolean } from "../../scripts/utils";

const [showNumbers, setShowNumbers] = createState(false);
export const showWorkspaceNumber = (show: boolean) => 
    setShowNumbers(show);


export const Workspaces = () => {
    const workspaces = createBinding(AstalHyprland.get_default(), "workspaces"),
        defaultWorkspaces = workspaces.as(wss => 
            wss.filter(ws => ws.id > 0).sort((a, b) => a.id - b.id)),
        specialWorkspaces = workspaces.as(wss => 
            wss.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id));


    return <Gtk.Box class={"workspaces-row"}>
        <Gtk.Box class={"special-workspaces"} spacing={4}>
            <For each={specialWorkspaces}>
                {(ws: AstalHyprland.Workspace) => 
                    <Gtk.Button class={"workspace"}
                      tooltipText={createBinding(ws, "name").as(name => {
                          name = name.replace(/^special\:/, "");
                          return name.charAt(0).toUpperCase().concat(name.substring(1, name.length));
                      })} onClicked={() => AstalHyprland.get_default().dispatch(
                          "togglespecialworkspace", ws.name.replace(/^special[:]/, "")
                      )}>

                        <With value={createBinding(ws, "lastClient")}>
                            {(lastClient: AstalHyprland.Client|null) => lastClient &&
                                <Gtk.Image class="last-client" iconName={
                                    createBinding(lastClient, "initialClass").as(initialClass =>
                                        getSymbolicIcon(initialClass) ?? getAppIcon(initialClass) ?? 
                                            "application-x-executable-symbolic")} 
                                />
                            }
                        </With>
                    </Gtk.Button>
                }
            </For>
        </Gtk.Box>
        <Separator alpha={.2} orientation={Gtk.Orientation.HORIZONTAL}
          margin={12} spacing={8} visible={variableToBoolean(specialWorkspaces)}
        />
        <Gtk.Box class={"default-workspaces"} spacing={4} $={(self) => {
              const conns: Map<GObject.Object, Array<number>|number> = new Map();
              const controllerScroll = Gtk.EventControllerScroll.new(
                  Gtk.EventControllerScrollFlags.VERTICAL
              ), controllerMotion = Gtk.EventControllerMotion.new();

              self.add_controller(controllerScroll);
              self.add_controller(controllerMotion);

              conns.set(controllerScroll, controllerScroll.connect("scroll", (_, _dx, dy) => {
                  dy > 0 ?
                      AstalHyprland.get_default().dispatch("workspace", "e-1")
                  : AstalHyprland.get_default().dispatch("workspace", "e+1");

                  return true;
              }));

              conns.set(controllerMotion, [
                  controllerMotion.connect("enter", () => setShowNumbers(true)),
                  controllerMotion.connect("leave", () => setShowNumbers(false))
              ]);

              conns.set(self, self.connect("destroy", () => conns.forEach((ids, obj) =>
                  Array.isArray(ids) ? 
                      ids.forEach(id => obj.disconnect(id))
                  : obj.disconnect(ids)
              )));
          }}>
            <For each={defaultWorkspaces}>
                {(ws: AstalHyprland.Workspace, i) => {
                    const showId = createComputed([
                        Config.getDefault().bindProperty("workspaces.always_show_id", "boolean").as(Boolean),
                        Config.getDefault().bindProperty("workspaces.enable_helper", "boolean").as(Boolean),
                        showNumbers,
                        i
                    ], (alwaysShowIds, enableHelper, showIds, i) => {
                        if(enableHelper && !alwaysShowIds) {
                            const previousWorkspace = defaultWorkspaces.get()[i-1];
                            const nextWorkspace = defaultWorkspaces.get()[i+1];

                            if((defaultWorkspaces.get().filter((_, ii) => ii < i).length > 0 && 
                                previousWorkspace?.id < (ws.id-1)) || 
                               (defaultWorkspaces.get().filter((_, ii) => ii > i).length > 0 && 
                                nextWorkspace?.id > (ws.id+1))) {

                                return true;
                            }
                        }

                        return alwaysShowIds || showIds;
                    });
                    
                    return <Gtk.Button class={createComputed([
                          createBinding(AstalHyprland.get_default(), "focusedWorkspace"),
                          showId
                      ], (focusedWs, showWsNumbers) =>
                          `workspace ${focusedWs.id === ws.id ? "focus" : ""} ${
                              showWsNumbers ? "show" : ""}`
                      )} tooltipText={createComputed([
                          createBinding(ws, "lastClient"),
                          createBinding(AstalHyprland.get_default(), "focusedWorkspace")
                      ], (lastClient, focusWs) => focusWs.id === ws.id ? "" : 
                          `workspace ${ws.id}${ lastClient ? ` - ${
                              !lastClient.title.toLowerCase().includes(lastClient.class) ?
                                  `${lastClient.get_class()}: `
                              : ""
                          } ${lastClient.title}` : "" }`
                      )} onClicked={() => ws.focus()}>
                        
                        
                        <With value={createBinding(ws, "lastClient")}>
                            {(lastClient: AstalHyprland.Client) => 
                                <Gtk.Box class={"last-client"} hexpand>
                                    <Gtk.Revealer transitionDuration={200} revealChild={showId}
                                      transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
                                      hexpand>

                                        <Gtk.Label label={createBinding(ws, "id").as(String)}
                                          class={"id"} hexpand />
                                    </Gtk.Revealer>
                                    {lastClient && <Gtk.Image class={"last-client-icon"} iconName={
                                      createBinding(lastClient, "initialClass").as(initialClass =>
                                          getSymbolicIcon(initialClass) ?? getAppIcon(initialClass) ??
                                              "application-x-executable-symbolic")} 
                                      hexpand={true} vexpand={true}
                                    />}
                                </Gtk.Box>
                            }
                        </With>
                    </Gtk.Button>
                }}
            </For>
        </Gtk.Box>
    </Gtk.Box>
}
