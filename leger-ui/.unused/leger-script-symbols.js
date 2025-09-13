const hash = (args) => {
    if (!args[0]) throw new Error("Fatal error : keyless symbol !");
    return `document.getElementById("${args[0]}").innerHTML`;
};
const dollar = (args) => {
    if (!args[0]) throw new Error("Fatal error : keyless symbol !");
    return `${args[0]}`;
};
const dot = (args) => {
    if (!args[0]) throw new Error("Fatal error : keyless symbol !");
    return `components.${args[0]}`;
};

const symbols = [
    { id: "#", method: hash },
    { id: "$", method: dollar },
    { id: ".", method: dot }
];

module.exports = symbols;