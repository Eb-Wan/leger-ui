const lgsInterpolation = require("./lgs-interpolation.js");

function view(lgs, mem) {
    mem["view"] = lgsInterpolation(lgs, mem);
}
function style(lgs, mem) {
    mem["style"] = lgsInterpolation(lgs, mem);
}
function script(lgs, mem) {
    mem["script"] = lgsInterpolation(lgs, mem);
}

const lgsFunctions = [
    { id: "view", func: view },
    { id: "style", func: style },
    { id: "script", func: script }
];

module.exports = lgsFunctions;