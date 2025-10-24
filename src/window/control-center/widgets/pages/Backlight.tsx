import { Astal, Gtk } from "ags/gtk4";
import { tr } from "../../../../i18n/intl";
import { Backlights } from "../../../../modules/backlight";
import { Page, PageButton } from "../Page";
import { createBinding, For, With } from "ags";
import { addSliderMarksFromMinMax } from "../../../../modules/utils";
import { userData } from "../../../../config";


export const PageBacklight = <Page
    id={"backlight"}
    title={tr("control_center.pages.backlight.title")}
    description={tr("control_center.pages.backlight.description")}
    actionOpen={() => {
        const dataDefaultBacklight = userData.getProperty("control_center.default_backlight", "any");
        if(typeof dataDefaultBacklight === "string" && 
           Backlights.getDefault().default?.name !== dataDefaultBacklight) {

            const bk = Backlights.getDefault().backlights.filter(b => b.name === dataDefaultBacklight)[0];
            if(!bk) return;

            Backlights.getDefault().setDefault(bk);
        }
    }}
    content={() => (
        <With value={createBinding(Backlights.getDefault(), "backlights")}>
            {(bklights: Array<Backlights.Backlight>) => bklights.length > 0 &&
                <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    <Gtk.Box class={"list"} visible={createBinding(Backlights.getDefault(), "backlights")
                        .as((bklights) => bklights.length > 1)}>
                        
                        <Gtk.Label label={"Default"} />
                        <For each={createBinding(Backlights.getDefault(), "backlights")}>
                            {(bk: Backlights.Backlight) => 
                                <PageButton class={createBinding(bk, "isDefault").as(is => is ? "highlight" : "")} 
                                  title={bk.name}
                                  icon={"video-display-symbolic"}
                                  actionClicked={() => {
                                      if(Backlights.getDefault().default?.path !== bk.path) {
                                          Backlights.getDefault().setDefault(bk);
                                          // save data
                                          userData.setProperty(
                                              "control_center.default_backlight", 
                                              bk.name, 
                                              true
                                          );
                                      }
                                  }}
                                  endWidget={
                                      <Gtk.Image iconName={"object-select-symbolic"} 
                                        visible={createBinding(bk, "isDefault")} 
                                      />
                                  }
                                />
                            }
                        </For>
                    </Gtk.Box>
                    <Gtk.Box class={"sliders"} orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        {bklights.map((bklight, i) =>
                            <Gtk.Box class={"bklight"} orientation={Gtk.Orientation.VERTICAL}
                              spacing={4}>

                                <Gtk.Label class={"subheader"} label={`Backlight ${i+1} (${bklight.name})`} 
                                  xalign={0} />
                                <Astal.Slider $={(self) => addSliderMarksFromMinMax(self)} 
                                  min={0} max={bklight.maxBrightness}
                                  value={createBinding(bklight, "brightness")}
                                  onChangeValue={(_, __, value) => {
                                      bklight.brightness = value
                                  }}
                                />
                            </Gtk.Box>
                        )}
                    </Gtk.Box>
                </Gtk.Box>
            }
        </With>
    )}
    headerButtons={[{
        icon: "arrow-circular-top-right",
        tooltipText: tr("control_center.pages.backlight.refresh"),
        actionClicked: () => Backlights.getDefault().scan()
    }]}
/> as Page;
