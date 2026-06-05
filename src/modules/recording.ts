import { execAsync } from "ags/process";
import { getter, register, signal } from "ags/gobject";
import { Gdk } from "ags/gtk4";
import { getPID, killProc, makeDirectory, tryNotifyOptions } from "./utils";
import Notifications from "./notifications";
import { time } from "./utils";
import { generalConfig } from "../config";

import GObject from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


// TODO: support monitoring an already-running instance of wf-recorder on startup
/** screen-recording module for colorshell */
@register({ GTypeName: "Recording" })
class Recording extends GObject.Object {
    private static instance: Recording;

    @signal() started() {};
    @signal() stopped() {};

    /** set at startup, if a wf-recorder instance was already running before launching colorshell */
    #pid: number|null = null;
    #recording: boolean = false;
    #path: string = "~/Recordings";

    /** Default extension: mp4(h264) */
    #extension: string = "mp4";
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

    @getter(String)
    public get recordingTime() {
        if(!this.#recording || !this.#startedAt)
            return "not recording";
            
        const startedAtSeconds = time.get().to_unix() - Recording.getDefault().startedAt!;
        if(startedAtSeconds <= 0) return "00:00";

        const seconds = Math.floor(startedAtSeconds % 60);
        const minutes = Math.floor(startedAtSeconds / 60);
        const hours = Math.floor(minutes / 60);

        return `${hours > 0 ? `${hours < 10 ? '0' : ""}${hours}` : ""}${ minutes < 10 ? `0${minutes}` : minutes }:${ seconds < 10 ? `0${seconds}` : seconds }`;
    }

    /** Recording output file name. null if screen is not being recorded */
    public get output() { return this.#output; }


    constructor() {
        super();
        this.#path = `${GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS)}/Recordings`;

        // restore screen recording monitor
        const pid = getPID("wf-recorder");
        if(pid !== undefined) {
            this.#pid = pid;
            this.#startedAt = time.get().to_unix();
            this.notify("started-at");
            this.#recording = true;
            this.notify("recording");
            
            const disposeTimeSub = time.subscribe(() => this.notify("recording-time"));
            // couldn't get anywhere with giowatch :broken_heart:
            const procDir = Gio.File.new_for_path(`/proc/${this.#pid}/status`);
            const monitor = procDir.monitor_file(Gio.FileMonitorFlags.NONE, null);
            const id = monitor.connect("changed", (_, __, ___, e) => {
                console.log(e);
                if(e !== Gio.FileMonitorEvent.DELETED || e !& Gio.FileMonitorEvent.DELETED)
                    return;

                monitor.disconnect(id);
                monitor.cancel();

                console.log("stopped recording :D");
                this.#recording = false;
                disposeTimeSub();
                this.emit("stopped");
                this.notify("recording");
                this.#startedAt = -1;
                this.notify("started-at");
            });
        }
    }

    public static getDefault() {
        if(!this.instance)
            this.instance = new Recording();

        return this.instance;
    }

    public startRecording(area?: Gdk.Rectangle) {
        if(this.#recording) 
            throw new Error("Screen Recording is already running!");

        this.#output = `${time.get().format("%Y-%m-%d-%H%M%S")}_rec.${this.extension || "mp4"}`;
        makeDirectory(this.path);

        const areaString = `${area?.x ?? 0},${area?.y ?? 0} ${area?.width ?? 1}x${area?.height ?? 1}`;

        this.#process = Gio.Subprocess.new([
            "wf-recorder", 
            ...(area ? [ `-g`, areaString ] : []),
            ...(generalConfig.getProperty("screen_recording.include_audio") ? ["-a"] : []),
            "-f",
            `${this.path}/${this.output!}`
        ], Gio.SubprocessFlags.STDERR_PIPE);

        let stderr: string|null = null;
        this.#process.communicate_utf8_async(null, null, (_, res) => {
            const [, , err] = this.#process!.communicate_utf8_finish(res);

            if(err !== undefined && err !== null)
                stderr = err;
        });

        const disposeTimeSub = time.subscribe(() => 
            this.notify("recording-time")
        );

        this.#process.wait_check_async(null, (_, res) => {
            disposeTimeSub();
            if(!this.#process) { // just if, for some reason
                this.stopRecording();
                return;
            }

            tryNotifyOptions({
                summary: "Screen Recording Error",
                messagePrefix: `The screen recorder exited unexpectedly: ${
                    stderr !== null ? `${stderr}.` : ""
                }`
            }, this.#process!.wait_check_finish, res);
            this.stopRecording();
        });

        this.#startedAt = time.get().to_unix();
        this.#recording = true;
        this.notify("started-at");
        this.notify("recording");
        this.emit("started");

    }

    public stopRecording() {
        if(this.#pid !== null) {
            killProc(this.#pid);
        } else {
            if(!this.#process || !this.#recording)
                return;

            !this.#process.get_if_exited() &&
                killProc(Number.parseInt(this.#process.get_identifier()!));
        }

        const output = this.#output;

        this.#process = null;
        this.#recording = false;
        this.#startedAt = -1;
        this.#output = null;
        this.notify("recording");
        this.emit("stopped");

        Notifications.getDefault().sendNotification({
            actions: output != null ? [
                {
                    text: "View", // will be hidden(can be triggered by clicking in the notification)
                    id: "view",
                    onAction: () => {
                        execAsync(["xdg-open", `${this.#path}/${output}`]);
                    }
                }, {
                    text: "Open file directory",
                    id: "view-directory",
                    onAction: () => execAsync(`xdg-open '${this.#path}'`)
                }
            ] : undefined,
            appName: "colorshell",
            summary: "Screen Recording",
            body: output != null ?
                `Saved recording as "${this.#path}/${output}"`
            : "Saved under an unknown path. Either colorshell was started after \
starting a screen recording, or the shell was closed while screen-recording"
        });
    }
}

export default Recording;
