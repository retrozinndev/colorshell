import { Gtk } from "ags/gtk4";
import { getAppIcon, getSymbolicIcon } from "../../../modules/apps";
import { Separator } from "../../../widget/Separator";
import { generalConfig } from "../../../config";
import { createBinding, createComputed, createState, For, With } from "ags";
import { variableToBoolean } from "../../../modules/utils";

import AstalHyprland from "gi://AstalHyprland";


const [showNumbers, setShowNumbers] = createState(false);
export const showWorkspaceNumber = (show: boolean) => 
    setShowNumbers(show);


export const Workspaces = () => {
    const workspaces = createBinding(AstalHyprland.get_default(), "workspaces"),
        defaultWorkspaces = workspaces.as(wss => 
            wss.filter(ws => ws.id > 0).sort((a, b) => a.id - b.id)),
        specialWorkspaces = workspaces.as(wss => 
            wss.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id)),
        focusedWorkspace = createBinding(AstalHyprland.get_default(), "focusedWorkspace");


    return <Gtk.Box class={"workspaces-row"} visible={createComputed([
          workspaces.as(wss => wss.length <= 1),
          generalConfig.bindProperty("workspaces.hide_if_single", "boolean")
      ], (hideable, enabled) => enabled && hideable ? false : true
    )}>
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
        <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
          transitionDuration={220} revealChild={variableToBoolean(specialWorkspaces)}>

            <Separator alpha={.2} orientation={Gtk.Orientation.HORIZONTAL}
              margin={12} spacing={8} visible={variableToBoolean(specialWorkspaces)}
            />
        </Gtk.Revealer>
        <Gtk.Box class={"default-workspaces"} spacing={4}>
            <Gtk.EventControllerScroll $={(self) => self.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)}
              onScroll={(_, __, dy) => {
                  dy > 0 ?
                      AstalHyprland.get_default().dispatch("workspace", "e-1")
                  : AstalHyprland.get_default().dispatch("workspace", "e+1");

                  return true;
              }}
            />
            <Gtk.EventControllerMotion onEnter={() => setShowNumbers(true)}
              onLeave={() => setShowNumbers(false)}
            />
            <For each={defaultWorkspaces}>
                {(ws: AstalHyprland.Workspace, i) => {
                    const showId = createComputed([
                        generalConfig.bindProperty("workspaces.always_show_id", "boolean").as(Boolean),
                        generalConfig.bindProperty("workspaces.enable_helper", "boolean").as(Boolean),
                        showNumbers,
                        i
                    ], (alwaysShowIds, enableHelper, showIds, i) => {
                        if(enableHelper && !alwaysShowIds) {
                            const previousWorkspace = defaultWorkspaces.get()[i-1];
                            const nextWorkspace = defaultWorkspaces.get()[i+1];

                            if((defaultWorkspaces.get().filter((_, ii) => ii < i).length > 0 && 
                                previousWorkspace?.id < (ws.id-1)) || 
                               (defaultWorkspaces.get().filter((_, ii) => ii > i).length > 0 && 
                                nextWorkspace?.id > (ws.id+1))
                              || (i === 0 && ws.id > 1)) {

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
                      )} onClicked={() => focusedWorkspace.get()?.id !== ws.id && ws.focus()}>
                        
                        <With value={createBinding(ws, "lastClient")}>
                            {(lastClient: AstalHyprland.Client) => 
                                <Gtk.Box class={"last-client"} hexpand>
                                    <Gtk.Revealer transitionDuration={280} revealChild={showId}
                                      transitionType={focusedWorkspace.as(
                                          fws => fws.id !== ws.id ? 
                                              Gtk.RevealerTransitionType.SLIDE_LEFT
                                          : Gtk.RevealerTransitionType.SLIDE_RIGHT
                                      )}>
                                        <Gtk.Label label={createBinding(ws, "id").as(String)}
                                          class={"id"} hexpand 
                                        />
                                    </Gtk.Revealer>
                                    {lastClient && <Gtk.Image class={"last-client-icon"} iconName={
                                      createBinding(lastClient, "initialClass").as(initialClass =>
                                          getSymbolicIcon(initialClass) ?? getAppIcon(initialClass) ??
                                              "application-x-executable-symbolic")} 
                                      hexpand vexpand visible={createBinding(AstalHyprland.get_default(), "focusedWorkspace")
                                          .as(fws => fws.id !== ws.id)}
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
