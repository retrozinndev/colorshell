import Client from "./client";
import Monitor from "./monitor";
import Workspace from "./workspace";
import Comp from "./compositor";


const Compositor = {
    ...Client,
    ...Monitor,
    ...Workspace,
    ...Comp
};

export default Compositor;
