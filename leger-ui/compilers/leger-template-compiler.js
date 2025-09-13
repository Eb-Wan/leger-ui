const fs = require("fs");

function templateCompiler(templates, projectDirectory) {
    try {
        let compiledTemplates = "";
        templates.forEach((t, index) => {
            const template = fs.readFileSync(projectDirectory+"/"+t.path, "utf-8").replace(/(\s)\1+|\n/g, "");
            if (template.includes("`")) throw new Error(`Template "${t.id}" contains backticks !`);
            compiledTemplates += `${t.id}:\`${template}\`${index != templates.length - 1 ?",":""}`;
        });
        return `const templates = {${compiledTemplates}};`;
    } catch (error) {
        console.log("Error while compiling templates.", error);
        process.exit(1);
    }
}

module.exports = templateCompiler;