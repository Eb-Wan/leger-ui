import { existsSync, readFileSync } from "fs";
import { projectDirectory, outputDirectory } from "./leger-ui.js";
import { ldxParser } from "./ldx-parser.js";
import { ldxPreprocessor } from "./ldx-preprocessor.js";

function ldxCompile(path, params = {}) {
    let app = [];
    parseLdxFile(path, params, app);
    app = ldxPreprocessor(app);

    // console.log(JSON.stringify(app));

    compilePreprocessedApp(app);

    return {};
}

function parseLdxFile(path, params = {}, imports) {
    const resolvedPath = projectDirectory+"/"+path;
    if (!existsSync(resolvedPath)) throw new Error(`Script ${resolvedPath} doesn't exist.`);

    let parsed = ldxParser(readFileSync(resolvedPath, "utf-8").replaceAll(/\/\*([\s\S]*?)\*\//gm, ""));
    if (!parsed.length || parsed.length > 1) throw new Error("Only one element allowed at top level of a file");
    if (!imports.find(e => e.path == path)) imports.push({ path, contents: parsed});

    importTemplates(parsed, imports);
    
    return parsed;

    function importTemplates(ldx, imports) {
        const templates = ldx.filter(e => e.tagName == "template");
        templates.forEach(e => {
            if (!e.attributes || !e.attributes.path) throw new Error("Unamed template in "+ resolvedPath);
            if (imports.find(f => f.path == e.attributes.path)) return;
            if (e.attributes.path) parseLdxFile(e.attributes.path, params, imports);
        });

        ldx.forEach(e => {
            if (!e.contents || !Array.isArray(e.contents)) return;
            importTemplates(e.contents, imports);
        });
    }
}

function compilePreprocessedApp(imports) {
    const router = imports[0].contents.find(e => e.tagName == "router");

    if (!router) throw new Error("No router defined");
    if (router && !router.contents) throw new Error("A router was found but it is empty");
    router.contents.forEach(e => {
        const routePath = e.attributes.path;
        if (!routePath) throw new Error("Route has no defined path");

        const outputPath = outputDirectory+"/"+routePath;
        const element = e;
        element.props = imports[0].props;
        compileImportedFile(outputPath, element, imports);
    });
}

function compileImportedFile(output, element, imports) {
    const html = elementToHmtl(element, imports, element.props);
    console.log(html)

    function elementToHmtl(element, imports, props) {
        if (!Array.isArray(element.contents)) return `${element.contents}`;
        let htmlStr = "";
        console.log(htmlStr)
        element.contents.forEach(e => {
            replaceWithImported();

            if (typeof e.contents == "string") htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${e.contents}</${e.tagName}>`;
            else if (Array.isArray(e.contents)) htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${elementToHmtl(e, imports, e.props ?? props)}</${e.tagName}>`;
            else htmlStr += `<${e.tagName}${attributesToString(e.attributes)} />`;
            function replaceWithImported() {
                if (!e.tagName[0].match(/[A-Z]/)) return;
                const templateProp = props[e.tagName];
                if (!templateProp) return;
                const imported = imports.find(e => e.path == templateProp.value);
                if (!imported) return;
                const importedElement = imported.contents[0];
                importedElement.attributes["l-t-id"] = imported.path;
                importedElement.props = imported.props;
                const children = e.contents;
                e = importedElement;
                if (children) props.children = children;
            }
        });
        return htmlStr;

        function attributesToString(att) {
            if (typeof att != "object") return "";
            let str = "";
            for (const [key, value] of Object.entries(att)) str += ` ${key}="${value}"`;
            return str;
        }
    }

    function elementToJS() {

    }
    function elementToCSS() {
        
    }
}

export { ldxCompile };


        // Mvp version, the router doesn't need to support directory creation
    
        // Compile JavaScript :
        //      Walk through the imported scripts
        //      Create init function for element 
        //          Get methods and assign as props
        //          Get vars and assign as props
        //      Window.onload
        //          querySelector("[l-id]").forEach -> execute init function
        //      Render as JS
        
        // Compile HTML :
        //      Walk through the imported scripts
        //      Find "router"
        //      ForEach Element in router
        //          If element imported assign l-id attribute
        //          Render as HTML
    
        // Compile CSS :
        //      Walk through the imported scripts
        //      Get all STYLE elements
        //      Compile as CSS