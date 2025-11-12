import { lgsInterpolate } from "./lgs-interpreter.js";

function expor(list, mem) {
    if (typeof(list) != "object") throw new Error("Export can only contain tags");
    for (const [ key, value ] of Object.entries(list)) {
        mem.exports[value] = mem[key];
    }
}
function view(lgs, mem) {
    mem["view"] = lgsInterpolate(lgs, mem, "view");
}
function style(lgs, mem) {
    mem["style"] = lgsInterpolate(lgs, mem, "style");
}
function script(lgs, mem) {
    mem["script"] = lgsInterpolate(lgs, mem, "script");
}

const lgsFunctions = [
    { id: "export", func: expor },
    { id: "view", func: view },
    { id: "style", func: style },
    { id: "script", func: script }
];

export default lgsFunctions;