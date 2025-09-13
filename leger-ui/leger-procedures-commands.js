const call = (value) => ` ${value}(params);`;
const get = (value) => ` let status = 100; fetch("${value}").then(res => { status = res.status; return res.json(); }).then(data => successFunction(data, status)).catch(error => errorFunction(error, status));`;
const success = (value) => ` function successFunction(data, status) { ${value}(data);}`;
const error = (value) => ` function errorFunction(error, status) { ${value}({ errorMessage: error.message, status }); console.error(error);}`;
const element = (value) => ` document.getElementById("${value}").innerHTML`;
const render = (value) => ` = render(templates.${value}, params);`;
const add = (value) => ` += ${value};`;
const sub = (value) => ` -= ${value};`;
const variable = (value) => ` ${value}`;
const print = (value) => ` = ${value};`;

const commands = [
    { id: "call", method: call },
    { id: "get", method: get },
    { id: "success", method: success },
    { id: "error", method: error },
    { id: "element", method: element },
    { id: "render", method: render },
    { id: "add", method: add },
    { id: "sub", method: sub },
    { id: "variable", method: variable },
    { id: "print", method: print },
];

module.exports = commands;