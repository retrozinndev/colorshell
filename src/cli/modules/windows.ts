import { Cli } from "..";


export default [
    {
        name: "open",
        onCalled: (_, data) => {
            return {
                type: "out",
                content: "TODO"
            }
        }
    }, {
        name: "toggle",
        onCalled: (_, data) => {
            return {
                type: "out",
                content: "TODO"
            }
        }
    }, {
        name: "close",
        onCalled: (_, data) => {
            return {
                type: "out",
                content: "TODO"
            }
        }
    }, {
        name: "windows",
        onCalled: () => {
            return {
                type: "out",
                content: "TODO"
            }
        }
    }, {
        name: "reopen",
        onCalled: () => {
            return {
                type: "out",
                content: "TODO"
            }
        }
    }
] satisfies Array<Cli.Command>;
