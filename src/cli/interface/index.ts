import GObject from "gi://GObject?version=2.0";

export interface CliInterface extends GObject.Object {
    $signals: CliInterface.SignalSignatures;

    /** stop receiving remote calls */
    stop(): void;
}

export namespace CliInterface {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "received": (args: Array<string>, remote: CliInterface.Remote) => void;
        "connected": (remote: CliInterface.Remote) => void;
    }

    export interface Remote {
        /** whether the remote has already exited/disconnected from the comm */
        get exited(): boolean;

        /** print a `message` to the remote caller
          * @param msg the message string
          * @param err whether it should be printed with an error fd (default: `false`) */
        print(msg: string, err?: boolean): void;

        /** print a `message` with a line break to the remote caller
          * @param msg the message string
          * @param err whether it should be printed with an error fd (default: `false`) */
        println(msg: string, err?: boolean): void;

        /** close the connection with the remote caller.
          * @param code the exit code to return to the remote caller (default: `0`) */
        exit(code: number): void;
    }
}

export default CliInterface;
