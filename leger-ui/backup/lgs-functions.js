import { lgsInterpolate } from "./lgs-interpreter.js";

function localExport(list, mem) {
    if (typeof(list) != "object") throw new Error("Export can only contain tags");
    for (const [ key, value ] of Object.entries(list)) {
        mem.exports[key] = mem[value];
    }
}
function globalExport(list, mem) {
    if (typeof(list) != "object") throw new Error("Global can only contain tags");
    for (const [ key, value ] of Object.entries(list)) {
        mem.globals[key] = mem[value];
    }
}
function importLgs(list, mem) {
    if (typeof(list) != "object") throw new Error("Import can only contain tags");
    for (const [ key, value ] of Object.entries(list)) {
        if (!mem.globals.imports) mem.globals.imports = {};
        if (!mem.globals.imports[key]) mem.globals.imports[key] = value;
    }
}
function lang(lgs, mem) {
    mem["globals"]["lang"] = lgsInterpolate(lgs, mem, "lang");
}
function head(lgs, mem) {
    mem["globals"]["head"] = lgsInterpolate(lgs, mem, "head");
}
function view(lgs, mem) {
    mem["globals"]["view"] = lgsInterpolate(lgs, mem, "view");
}
function style(lgs, mem) {
    mem["globals"]["style"] = lgsInterpolate(lgs, mem, "style");
}
function script(lgs, mem) {
    mem["globals"]["script"] = lgsInterpolate(lgs, mem, "script");
}

const lgsFunctions = [
    { id: "export", func: localExport },
    { id: "global", func: globalExport },
    { id: "import", func: importLgs },
    { id: "lang", func: lang },
    { id: "head", func: head },
    { id: "view", func: view },
    { id: "style", func: style },
    { id: "script", func: script }
];

export default lgsFunctions;