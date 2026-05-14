import { gtype, property, register, signal } from "ags/gobject";
import { execAsync } from "ags/process";
import Compositor from "../compositor";
import Notifications from "./notifications";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


/** screen-shotting tool for colorshell, based on grim and slurp */
@register({ GTypeName: "ClshScreenshotTool" })
class Screenshot extends GObject.Object {
    private static instance: Screenshot;
    declare $signals: Screenshot.SignalSignatures;

    @signal(String)
    tookScreenshot(_: string) {}

    /** default screenshot mode to fallback to if none is specified */
    @property(gtype<Screenshot.Mode>(Number))
    mode: Screenshot.Mode = Screenshot.Mode.SELECT;

    /** include mouse cursors in the screenshot */
    @property(Boolean)
    includeCursors: boolean = false;

    /** whether to copy the screenshot image to clipboard */
    @property(Boolean)
    copyToClipboard: boolean = true;

    @property(Gio.File)
    outputDir: Gio.File = Gio.File.new_for_path(`${
        GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) ??
            `${GLib.get_home_dir()}/Pictures`
    }/Screenshots`);


    public static getDefault(): Screenshot {
        if(!this.instance)
            this.instance = new Screenshot();

        return this.instance;
    }

    /** takes a screenshot using grim+slurp with the specified geometry and mode.
      * @returns the screenshot image output path; or null if the screenshot was cancelled\
      * (only possible in SELECT mode) */
    async take(mode: Screenshot.Mode = this.mode, area?: Screenshot.Area): Promise<string|null> {
        const output = `${this.outputDir.peek_path()!}/${this.genFileName()}_screenshot.png`;

        if(mode === Screenshot.Mode.SELECT) {
            const selection = area ?? await this.select();

            if(selection === null)
                return null;

            try {
                await this.grim(output, selection);
            } catch(e) {
                console.error(e);
                return null;
            }

            return output;
        }

        if(mode === Screenshot.Mode.ACTIVE_WINDOW) {
            const activeClient = Compositor.getDefault().focusedClient;

            if(activeClient) {
                const clientArea = activeClient.allocation!;

                // TODO: screenshot in a more clean way, lik,e getting the pixels from the window instead of
                // screenshoting the window's area

                try {
                    await this.grim(output, clientArea);
                } catch(e) {
                    console.error(e);
                    return null;
                }
                return output;
            }
        }

        try {
            await this.grim(output);
            return output;
        } catch(e) {
            console.error(e);
        }

        return null;
    }

    /** creates a new area selection layer for the user to interact with.
      * 
      * @returns a `Screenshot.Area` object, containing the selected area geometry; or \
      * null if the user cancelled the selection */
    async select(): Promise<Screenshot.Area|null> {
        let region!: string;
        try {
            region = await execAsync("slurp");
        } catch(e) {
            return null; // if the user cancelled the selection
        }

        return this.slurpToArea(region);
    }

    protected async grim(output: string, area?: Screenshot.Area): Promise<void> {
        try {
            await execAsync(`grim ${
                area ? `-g "${this.areaToSlurp(area)}"` : ""
            } ${this.includeCursors ? "-c" : ""} ${output}`);
            execAsync(`sh -c "cat '${output}' | wl-copy"`).catch(e =>
                Notifications.getDefault().sendNotification({
                    appName: "colorshell",
                    summary: "Failed to copy Screenshot",
                    body: `The recent screenshot you took couldn't be automatically copied because of an error: ${(e as Gio.IOErrorEnum).message}`
                })
            );
            Notifications.getDefault().sendNotification({
                appName: "colorshell",
                summary: "Screenshot",
                body: `The screenshot was saved as ${output}`,
                image: output,
                actions: [{
                    id: "view",
                    text: "View",
                    onAction: () => execAsync(`xdg-open "${output}"`).catch(e =>
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Failed to open screenshot",
                            body: `Failed to open image with xdg-open: ${(e as Error).message}`,
                        })
                    )
                }]
            });
        } catch(e) {
            throw new Error(`Screenshot: Failed to take a screenshot. Stderr: ${(e as Error).message}`);
        }
    }

    /** generates a screenshot file name based in the current local time */
    protected genFileName(): string {
        return GLib.DateTime.new_now_local().format("%Y-%m-%d-%H-%M-%S")!;
    }

    /** translates a slurp geometry string to a `Screenshot.Area` object */
    protected slurpToArea(geometry: string): Screenshot.Area {
        if(!/^(\d)+,(\d)+ (\d)+x(\d)+$/.test(geometry))
            throw new Error("Screenshot: the provided slurp geometry is invalid and could not be translated");

        const [pos, size] = geometry.split(' ');
        const [x, y] = pos.split(',').map(s => Number.parseInt(s)),
            [width, height] = size.split('x').map(s => Number.parseInt(s));

        return new Screenshot.Area({ x, y, width, height });
    }

    /** translates a `Screenshot.Area` object to a valid slurp geometry */
    protected areaToSlurp(area: Screenshot.Area): string {
        return `${area.x},${area.y} ${area.width}x${area.height}`;
    }
}

namespace Screenshot {
    export enum Mode {
        /** open a selection layer to select the screenshot area */
        SELECT = 0,
        /** full screenshot */
        FULL = 1,
        /** take a screenshot of the active client(window); if there's none, fallback to FULL */
        ACTIVE_WINDOW = 2
    }

    export class Area {
        public readonly x: number;
        public readonly y: number;
        public readonly width: number;
        public readonly height: number;

        constructor(props: {
            x: number,
            y: number,
            width: number,
            height: number
        }) {
            this.x = props.x;
            this.y = props.y;
            this.width = props.width;
            this.height = props.height;
        }
    }

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        /** triggered when a screenshot is finished.
          * @param mode the screenshot area mode
          * @param path the output file of the screenshot
          * */
        "took-screenshot": (mode: Screenshot.Mode, path: string) => void;
        "notify::mode": () => void;
        "notify::include-cursors": () => void;
    }
}

export default Screenshot;
