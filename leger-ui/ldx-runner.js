document.addEventListener("DOMContentLoaded", function(event) {
    app.forEach(e => {
        e.props = prepareProps(e.props);
        document.querySelectorAll(`[l-app-element-id='${e.path}']`).forEach(n => {
            initElement(n, e);
        });
    });
    function prepareProps(props) {
        if (typeof props != "object") return {};
        for (const [key, value] of Object.entries(props)) {
            props[key] = toValue(value);
        }
        return props;
        function toValue(value) {
            if (typeof value != "object" || !value.type) console.error("Failed to deserialize prop in", e.path);
            else if (value.type == "num") return Number(value.value);
            else if (value.type == "str") return String(value.value);
            else if (value.type == "bool") return (value.value == "true" || value.value == "1") ? true : false;
            else if (value.type == "func") return Function("args", value.value);
            else if (value.type == "style") return String(value.value);
            else if (value.type == "template") return String(value.value);
            else console.error("Unkown prop type in", e.path);
        }
    }
    return;
    function initElement(htmlElement, appElement) {
        htmlElement.props = {...appElement.props};
        htmlElement.props._element = htmlElement;
        htmlElement.props._exec = exec.bind(htmlElement.props);
        htmlElement.props._exec();
        return;
    }
    
    function exec(method, args = {}) {
        if (typeof args != "object" || Array.isArray(args)) {
            console.error("Type of args of _exec must be object");
            return;
        }
        if (!method || typeof method != "function") {
            render(this);
            return;
        }
        method.call(this, args);
        render(this);
        return;
    
        function render(htmlElement) {
            assignContent(htmlElement._element.querySelectorAll("[l-content]"), htmlElement);
            assignAttributes(htmlElement._element.querySelectorAll("[l-a-href]"), "href", htmlElement);
            assignAttributes(htmlElement._element.querySelectorAll("[l-a-id]"), "id", htmlElement);
            assignAttributes(htmlElement._element.querySelectorAll("[l-a-class]"), "class", htmlElement);
            assignEventListeners(htmlElement._element.querySelectorAll("[l-onclick]"), "click", htmlElement);
            assignEventListeners(htmlElement._element.querySelectorAll("[l-onload]"), "load", htmlElement);
        }
        function assignContent(elements, htmlElement) {
            if (!elements && elements.length > 0) return;
            elements.forEach(e => {
                const value = htmlElement[e.getAttribute("l-content")];
                if (Array.isArray(value)) e.innerHTML = elementToHTML(value);
                else e.textContent = value;
            });
        }
        function assignAttributes(elements, attribute, htmlElement) {
            if (!elements && elements.length > 0) return;
            elements.forEach(e => {
                const value = htmlElement[e.getAttribute("l-a-"+attribute)];
                e.setAttribute(attribute, value);
            });
        }
        function assignEventListeners(elements, eventType, htmlElement) {
            if (!elements && elements.length > 0) return;
            elements.forEach(e => {
                const method = htmlElement[e.getAttribute("l-on"+eventType)];
                if (!method || typeof method != "function") throw new Error(`Method '${e.getAttribute("l-on"+eventType)}' doesn't exist.`);
                if (eventType == "load") e["on"+eventType] = event => htmlElement._exec(method, { event, element: htmlElement });
                else e["on"+eventType] = event => htmlElement._exec(method, { event });
            });
        }
        function elementToHTML(element, app, props) {
            if (!Array.isArray(element.contents)) return `${element.contents}`;
            let htmlStr = "";
            element.contents.forEach(e => {
                replaceWithImported();
    
                if (typeof e.contents == "string") htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${e.contents}</${e.tagName}>`;
                else if (Array.isArray(e.contents)) htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${elementToHTML(e, app, e.props ?? props)}</${e.tagName}>`;
                else htmlStr += `<${e.tagName}${attributesToString(e.attributes)} />`;
                function replaceWithImported() {
                    if (!e.tagName[0].match(/[A-Z]/)) return;
                    const templateProp = props[e.tagName];
                    if (!templateProp) return;
                    const imported = app.find(e => e.path == templateProp.value);
                    if (!imported) return;
                    const importedElement = imported.contents[0];
                    importedElement.attributes["l-app-element-id"] = imported.path;
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
                for (const [key, value] of Object.entries(att)) {
                    str += ` ${key}="${value}"`;
                }
                return str;
            }
        }
    }
});