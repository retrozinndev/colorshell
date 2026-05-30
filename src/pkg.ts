import "./overrides"; // thanks Aylur!!
import I18n from "./i18n/intl";

Object.assign(globalThis, {
    assert(...conditions: Array<any>): boolean {
        if(!conditions.every(v => Boolean(v)))
            throw new Error("Assertion: At least one of the conditions are falsy");

        return true;
    }
});
I18n.init();
