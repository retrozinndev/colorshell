import { execAsync, GLib, GObject, property, register, signal } from "astal";
import { Connectable } from "astal/binding";
import { Gdk } from "astal/gtk3";
import { getDateTime } from "./time";
import { getUserDirs } from "./utils";

@register({ GTypeName: "ScreenRecording" })
class Recording extends GObject.Object implements Connectable {

    private static instance: Recording;

    @signal()
    declare started: () => void;
    @signal(String)
    declare stopped: (outputFile: string) => void;
    @signal(String)
    declare outputChanged: (newPath: string) => void;

    #recording: boolean = false;
    #path: string = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS) || `${GLib.get_home_dir()}/Recordings`;

    /** Default extension: mp4(h264) */
    #extension: string = "mp4";
    #recordAudio: boolean = false;
    #monitor: (number|null) = null;
    #area: (Gdk.Rectangle|null) = null;
    #pid: (number|null) = null;

    @property(Boolean)
    public get recording() { return this.#recording; }
    private set recording(newValue: boolean) {
        (!newValue && this.recording) ? 
            this.stopRecording() 
        : this.startRecording(this.#monitor || 0, this.#area || undefined);

        this.#recording = newValue;
        this.notify("recording");
    }

    @property(String)
    public get path() { return this.#path; }
    public set path(newPath: string) {
        this.#path = newPath;
        this.notify("path");
    }

    @property(String)
    public get extension() { return this.#extension; }
    public set extension(newExt: string) {
        this.#extension = newExt;
        this.notify("extension");
    }

    @property(Boolean)
    public get recordAudio() { return this.#recordAudio; }
    public set recordAudio(newValue: boolean) {
        this.#recordAudio = newValue;
        this.notify("record-audio");
    }

    constructor() {
        super();
    }

    public static getDefault() {
        if(!this.instance)
            this.instance = new Recording();

        return this.instance;
    }

    public startRecording(monitor?: number, area?: Gdk.Rectangle) {
        if(this.#recording) 
            throw new Error("Screen Recording is already running!");

        const output = `${getDateTime().get().format("%Y-%m-%d-%H%M%S")}_rec.${this.extension || "mp4"}`;
        this.#recording = true;
        this.emit("started");
        execAsync([
            `sh ${ GLib.get_user_config_dir()}/ags/scripts/sh/recording.sh`, 
            `${ area ? `-g ${area?.x || 0},${area?.y || 0} ${area?.width || 1}x${area?.height || 1}` : "" }`, 
            `-f ${output}`
        ]).then(async (stdout: string) => {
            const pid: number = Number.parseInt(
                (await execAsync(`echo ${stdout} | head -n 1`)).split(':')[1]);

            this.#pid = pid;
        });
    }

    public stopRecording() {

    }
}

export { Recording };
