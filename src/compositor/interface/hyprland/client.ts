import Compositor from "../..";


class Client extends Compositor.Client {}

export namespace Client {
    export interface SignalSignatures extends Compositor.Client.SignalSignatures {}
    export interface ConstructorProps extends Compositor.Client.ConstructorProps {}
}

export default Client;
