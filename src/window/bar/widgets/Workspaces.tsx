import { Gtk } from "ags/gtk4";
import { getAppIcon, getSymbolicIcon } from "../../../modules/apps";
import { Separator } from "../../../widget/Separator";
import { generalConfig } from "../../../config";
import { createBinding, createComputed, createState, For, With } from "ags";
import { variableToBoolean } from "../../../modules/utils";
import Compositor from "../../../compositor";


const [showNumbers, setShowNumbers] = createState(false);
export const showWorkspaceNumber = (show: boolean) => 
    setShowNumbers(show);


export const Workspaces = () => {
    const workspaces = createBinding(Compositor.getDefault(), "workspaces"),
        defaultWorkspaces = workspaces.as(wss => 
            wss.filter(ws => ws.id > 0).sort((a, b) => a.id - b.id)),
        specialWorkspaces = workspaces.as(wss => 
            wss.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id)),
        focusedWorkspace = createBinding(Compositor.getDefault(), "focusedWorkspace");


    return <Gtk.Box class={"workspaces-row transparent"} visible={createComputed([
          workspaces.as(wss => wss.length <= 1),
          generalConfig.bindProperty("workspaces.hide_if_single", "boolean")
      ], (hideable, enabled) => enabled && hideable ? false : true
    )}>
        <Gtk.Box class={"special-workspaces"} spacing={4}>
            <For each={specialWorkspaces}>
                {(ws: Compositor.Workspace) => 
                    <Gtk.Button class={"workspace"}
                      tooltipText={createBinding(ws, "name").as(name => {
                          name = name?.replace(/^special\:/, "") ?? "";
                          return name.charAt(0).toUpperCase().concat(name.substring(1, name.length));
                      })} onClicked={() => ws.focus()}>

                        <With value={createBinding(ws, "lastFocusedClient")}>
                            {(lastClient: Compositor.Client|null) => lastClient &&
                                <Gtk.Image class="last-client" iconName={
                                    createBinding(lastClient, "class").as(name =>
                                        getSymbolicIcon(name) ?? getAppIcon(name) ?? 
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
            <Gtk.EventControllerScroll flags={Gtk.EventControllerScrollFlags.VERTICAL}
              onScroll={(_, __, dy) => {
                  const workspaces = defaultWorkspaces.get();
                  if(workspaces.length <= 1)
                      return;

                  const fwsIndex = workspaces.findIndex(ws => ws.id === focusedWorkspace.get()?.id) ?? 0;
                  const prevIndex = (fwsIndex - 1) < 0 ? (workspaces.length-1) : (fwsIndex-1);
                  const nextIndex = (fwsIndex + 1) > (workspaces.length-1) ? 0 : (fwsIndex+1);

                  dy < 0 ?
                      workspaces[prevIndex].focus() // up
                  : workspaces[nextIndex].focus(); // down

                  return true;
              }}
            />
            <Gtk.EventControllerMotion onEnter={() => setShowNumbers(true)}
              onLeave={() => setShowNumbers(false)}
            />
            <For each={defaultWorkspaces}>
                {(ws: Compositor.Workspace, i) => {
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
                          focusedWorkspace,
                          showId
                      ], (focusedWs, showWsNumbers) =>
                          `workspace ${focusedWs?.id === ws.id ? "focus" : ""} ${
                              showWsNumbers ? "show" : ""}`
                      )} tooltipText={createComputed([
                          createBinding(ws, "lastFocusedClient"),
                          focusedWorkspace
                      ], (lastClient, focusWs) => focusWs?.id === ws.id ? "" : 
                          `workspace ${ws.id}${ lastClient ? ` - ${
                              !lastClient.title.toLowerCase().includes(lastClient.class) ?
                                  `${lastClient.class}: `
                              : ""
                          } ${lastClient.title}` : "" }`
                      )} onClicked={() => focusedWorkspace.get()?.id !== ws.id && ws.focus()}>
                        
                        <With value={createBinding(ws, "lastFocusedClient")}>
                            {(lastClient: Compositor.Client|null) => 
                                <Gtk.Box class={"last-client"} hexpand>
                                    <Gtk.Revealer transitionDuration={280} revealChild={showId}
                                      transitionType={focusedWorkspace(
                                          fws => fws?.id !== ws.id ? 
                                              Gtk.RevealerTransitionType.SLIDE_LEFT
                                          : Gtk.RevealerTransitionType.SLIDE_RIGHT
                                      )}>
                                        <Gtk.Label label={createBinding(ws, "id").as(String)}
                                          class={"id"} hexpand 
                                        />
                                    </Gtk.Revealer>
                                    {lastClient && <Gtk.Image class={"last-client-icon"} iconName={
                                      createBinding(lastClient, "class").as(name =>
                                          getSymbolicIcon(name) ?? getAppIcon(name) ??
                                              "application-x-executable-symbolic")} 
                                      hexpand vexpand visible={focusedWorkspace(fws => fws?.id !== ws.id)}
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
