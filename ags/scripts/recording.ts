import { execAsync } from "ags/process";
import { getter, register, signal } from "ags/gobject";
import { Gdk } from "ags/gtk4";
import { makeDirectory } from "./utils";
import { Notifications } from "./notifications";
import { time } from "./utils";

import GObject from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


export { Recording };

@register({ GTypeName: "Recording" })
class Recording extends GObject.Object {
    private static instance: Recording;

    @signal() started() {};
    @signal() stopped() {};

    #recording: boolean = false;
    #path: string = "~/Recordings";

    /** Default extension: mp4(h264) */
    #extension: string = "mp4";
    #recordAudio: boolean = false;
    #area: (Gdk.Rectangle|null) = null;
    #startedAt: number = -1;
    #process: (Gio.Subprocess|null) = null;
    #output: (string|null) = null;

    /** GLib.DateTime of when recording started 
    * its value can be `-1` if undefined(no recording is happening) */
    @getter(Number)
    public get startedAt() { return this.#startedAt; }

    @getter(Boolean)
    public get recording() { return this.#recording; }
    private set recording(newValue: boolean) {
        (!newValue && this.#recording) ? 
            this.stopRecording() 
        : this.startRecording(this.#area || undefined);

        this.#recording = newValue;
        this.notify("recording");
    }

    @getter(String)
    public get path() { return this.#path; }
    public set path(newPath: string) {
        if(this.recording) return;

        this.#path = newPath;
        this.notify("path");
    }

    @getter(String)
    public get extension() { return this.#extension; }
    public set extension(newExt: string) {
        if(this.recording) return;

        this.#extension = newExt;
        this.notify("extension");
    }

    /** Recording output file name. %NULL if screen is not being recorded */
    public get output() { return this.#output; }

    /** Currently unsupported property */
    public get recordAudio() { return this.#recordAudio; }
    public set recordAudio(newValue: boolean) {
        if(this.recording) return;

        this.#recordAudio = newValue;
        this.notify("record-audio");
    }

    constructor() {
        super();
        const videosDir = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS);
        if(videosDir) this.#path = `${videosDir}/Recordings`;
    }

    public static getDefault() {
        if(!this.instance)
            this.instance = new Recording();

        return this.instance;
    }

    public startRecording(area?: Gdk.Rectangle) {
        if(this.recording) 
            throw new Error("Screen Recording is already running!");

        this.#output = `${time.get().format("%Y-%m-%d-%H%M%S")}_rec.${this.extension || "mp4"}`;
        this.#recording = true;
        this.notify("recording");
        this.emit("started");
        makeDirectory(this.path);

        const cancellable = Gio.Cancellable.new();
        cancellable.cancel = () => {};

        const areaString = `${area?.x ?? 0},${area?.y ?? 0} ${area?.width ?? 1}x${area?.height ?? 1}`;

        this.#process = Gio.Subprocess.new([
            "wf-recorder", 
            ...(area ? [ `-g`, areaString ] : []),
            "-f",
            `${this.path}/${this.output!}`
        ], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

        this.#process.wait_async(cancellable, () => {
            this.stopRecording();
        });

        this.#startedAt = time.get().to_unix();
    }

    public stopRecording() {
        if(!this.#process) return;

        !this.#process.get_if_exited() && execAsync([
            "kill", "-s", "SIGTERM", this.#process.get_identifier()!
        ]);

        const path = this.#path;
        const output = this.#output;

        this.#process = null;
        this.#recording = false;
        this.#startedAt = -1;
        this.#output = null;
        this.notify("recording");
        this.emit("stopped");

        Notifications.getDefault().sendNotification({
            actions: [
                {
                    text: "View",
                    onAction: () => {
                        execAsync(["nautilus", "-s", output!, path]);
                    }
                },
                {
                    text: "Open",
                    onAction: () => {
                        execAsync(["xdg-open", `${path}/${output}`]);
                    }
                }
            ],
            appName: "Screen Recording",
            summary: "Screen Recording saved",
            body: `Saved as ${path}/${output}`
        });
    }
};
