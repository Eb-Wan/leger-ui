const varDeclaration = (args) => {
    const value = args[2] || "";
    if (!args[1]) throw new Error("Invalid variable declaration, missing variable name.");
    return `var ${args[2]} = ${value}`;
};
const def = (args) => {
    if (!args[1]) throw new Error("Invalid function declaration, missing function name.");
    if (!args[2] && args[2][0] != "{") throw new Error("Invalid function declaration, missing functon code block.");
    return `function ${args[2]}(args) {\n${value}\n}`;
};
const call = (args) => {
    if (!args[1]) throw new Error("Fatal error !");
    const arguments = args.slice(1).map(a => a);
    return `${args[1]}(${arguments});\n}`;
};

const keywords = [
    { id: "call", method: call },
    { id: "var", method: varDeclaration },
    { id: "def", method: def }
];

module.exports = keywords;