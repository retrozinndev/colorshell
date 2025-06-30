import GObject, { register } from "ags/gobject";
import AstalWp from "gi://AstalWp";

export { Wireplumber };

@register({ GTypeName: "Wireplumber" })
class Wireplumber extends GObject.Object {
    private static astalWireplumber: (AstalWp.Wp|null) = AstalWp.get_default();
    private static inst: Wireplumber;

    private defaultSink: AstalWp.Endpoint = Wireplumber.astalWireplumber!.get_default_speaker()!;
    private defaultSource: AstalWp.Endpoint = Wireplumber.astalWireplumber!.get_default_microphone()!;

    private maxSinkVolume: number = 100;
    private maxSourceVolume: number = 100;

    constructor() {
        super();

        if(!Wireplumber.astalWireplumber) 
            throw new Error("Audio features will not work correctly! Please install wireplumber first", {
                cause: "Wireplumber library not found"
            });
    }

    public static getDefault(): Wireplumber {
        if(!Wireplumber.inst) 
            Wireplumber.inst = new Wireplumber();

        return Wireplumber.inst;
    }

    public static getWireplumber(): AstalWp.Wp {
        return Wireplumber.astalWireplumber!;
    }

    public getMaxSinkVolume(): number {
        return this.maxSinkVolume;
    }

    public getMaxSourceVolume(): number {
        return this.maxSourceVolume;
    }

    public getDefaultSink(): AstalWp.Endpoint {
        return this.defaultSink;
    }

    public getDefaultSource(): AstalWp.Endpoint {
        return this.defaultSource;
    }

    public getSinkVolume(): number {
        return Math.floor(this.getDefaultSink().get_volume() * 100);
    }

    public getSourceVolume(): number {
        return Math.floor(this.getDefaultSource().get_volume() * 100);
    }

    public setSinkVolume(newSinkVolume: number): void {
        this.defaultSink.set_volume(
            (newSinkVolume > this.maxSinkVolume ? this.maxSinkVolume : newSinkVolume) / 100
        );
    }

    public setSourceVolume(newSourceVolume: number): void {
        this.defaultSource.set_volume(
            newSourceVolume > this.maxSourceVolume ? this.maxSourceVolume : newSourceVolume / 100
        );
    }

    public increaseEndpointVolume(endpoint: AstalWp.Endpoint, volumeIncrease: number): void {
        volumeIncrease = Math.abs(volumeIncrease) / 100;

        if((endpoint.get_volume() + volumeIncrease) > (this.maxSinkVolume / 100)) {
            endpoint.set_volume(1.0);
            return;
        }

        endpoint.set_volume(endpoint.get_volume() + volumeIncrease);
    }

    public increaseSinkVolume(volumeIncrease: number): void {
        this.increaseEndpointVolume(this.getDefaultSink(), volumeIncrease);
    }

    public increaseSourceVolume(volumeIncrease: number): void {
        this.increaseEndpointVolume(this.getDefaultSource(), volumeIncrease);
    }

    public decreaseEndpointVolume(endpoint: AstalWp.Endpoint, volumeDecrease: number): void {
        volumeDecrease = Math.abs(volumeDecrease) / 100;

        if((endpoint.get_volume() - volumeDecrease) < 0) {
            endpoint.set_volume(0);
            return;
        }

        endpoint.set_volume(endpoint.get_volume() - volumeDecrease);
    }

    public decreaseSinkVolume(volumeDecrease: number): void {
        this.decreaseEndpointVolume(this.getDefaultSink(), volumeDecrease);
    }

    public decreaseSourceVolume(volumeDecrease: number): void {
        this.decreaseEndpointVolume(this.getDefaultSource(), volumeDecrease);
    }

    public muteSink(): void {
        this.getDefaultSink().set_mute(true);
    }

    public muteSource(): void {
        this.getDefaultSource().set_mute(true);
    }

    public unmuteSink(): void {
        this.getDefaultSink().set_mute(false);
    }

    public unmuteSource(): void {
        this.getDefaultSource().set_mute(false);
    }

    public isMutedSink(): boolean {
        return this.getDefaultSink().get_mute();
    }

    public isMutedSource(): boolean {
        return this.getDefaultSource().get_mute();
    }

    public toggleMuteSink(): void {
        if(this.isMutedSink()) 
            return this.unmuteSink();

        return this.muteSink();
    }

    public toggleMuteSource(): void {
        if(this.isMutedSource())
            return this.unmuteSource();

        return this.muteSource();
    }
}
