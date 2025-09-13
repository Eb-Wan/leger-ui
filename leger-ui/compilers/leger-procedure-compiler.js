const commands = require("../leger-procedures-commands");

function procedureCompiler(procedures) {
    let compiledProcedures = "";
    procedures.forEach(procedure => compiledProcedures += compileProcedure(procedure));
    return compiledProcedures;
}

function compileProcedure(procedure) {
    let content = "";

    for (const [key, value] of Object.entries(procedure.params)) {
        const command = commands.find(c => c.id == key);
        content += command.method(value);
    }
    return `\nfunction ${procedure.id}(params) {${content} }`;
}

module.exports = procedureCompiler;
