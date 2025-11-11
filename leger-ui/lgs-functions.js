const lgsInterpolation = require("./lgs-interpolation.js");

function declare(params, mem) {
    for (const [key, value] of Object.entries(params)) {
        mem.declarations[key] = value;
    }
}

function view() {

}
function style() {
    
}
function script() {
    
}

const lgsFunctions = [
    { id: "declare", func: declare },
    { id: "view", func: view },
    { id: "style", func: style },
    { id: "script", func: script }
];

module.exports = lgsFunctions;