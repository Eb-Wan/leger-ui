import { existsSync, readFileSync } from "fs";
import { projectDirectory, outputDirectory } from "./leger-ui.js";
import { ldxParser } from "./ldx-parser.js";

function ldxCompile(path, params = {}) {
    const imports = [];
    parseLdxFile(path, params, imports);

    console.log(JSON.stringify(imports));

    // Think about the router too

    // compile js
    imports.forEach(e => {
        // Compile JavaScript :
        //      Walk through the imported scripts
        //      Create init function for element 
        //          Get methods and assign as props
        //          Get vars and assign as props
        //      Window.onload
        //          querySelector("[l-id]").forEach -> execute init function
        //      Render as JS
    });
    
    // compile html
    imports.forEach(e => {
        // Compile HTML :
        //      Walk through the imported scripts
        //      Find "router"
        //      ForEach Element in router
        //          If element imported assign l-id attribute
        //          Render as HTML
    });

    // compile css
    imports.forEach(e => {
        // Compile CSS :
        //      Walk through the imported scripts
        //      Get all STYLE elements
        //      Compile as CSS
    });
}

function parseLdxFile(path, params = {}, imports) {
    const resolvedPath = projectDirectory+"/"+path;
    if (!existsSync(resolvedPath)) throw new Error(`Script ${resolvedPath} doesn't exist.`);

    let parsed = ldxParser(readFileSync(resolvedPath, "utf-8").replaceAll(/\/\*([\s\S]*?)\*\//gm, ""));
    if (!imports.find(e => e.path == path)) imports.push({ path, content: parsed});

    // Import ldx files
    // This only works if the import is at the top level of the file
    const templates = parsed.filter(e => e.tagName == "template");

    templates.forEach(e => {
        if (!e.attributes || !e.attributes.path) throw new Error("Unamed template in "+ resolvedPath);
        if (e.attributes.path) parseLdxFile(e.attributes.path, params, imports);
    });

    return parsed;
}

export { ldxCompile };