document.addEventListener("DOMContentLoaded", function(event) {
    console.log(app)

    const onLoadMethods = [];

    app.forEach(e => {
        e.props = prepareProps(e.props);
        document.querySelectorAll(`[l-app-element-id='${e.path}']`).forEach(n => {
            initElement(n, e);
        });
    });

    onLoadMethods.forEach(e => e());
    return;

    function prepareProps(props) {
        if (typeof props != "object") return {};
        for (const [key, value] of Object.entries(props)) {
            props[key] = toValue(value);
        }
        return props;
        function toValue(value) {
            console.log(value)
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
    function initElement(htmlElement, appElement) {
        if (typeof appElement != "object" || !appElement.props) return;
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
                if (htmlElement[e.getAttribute("l-mapto")] && Array.isArray(value)) e.replaceChildren(...mapTo(htmlElement[e.getAttribute("l-mapto")] ?? "", value));
                else e.textContent = value;
            });
            
            return;
            
            function mapTo(templateProp, array) { 
                const template = app.find(e => e.path == templateProp);
                
                if (!template) throw new Error(`Template ${templateProp} does not exists`);
                if (!array || !Array.isArray(array)) throw new Error("l-content property must be an array for use with l-mapto");
                
                return array.map(e => templateToHTMLElement(template, app, e)[0]);
            }
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
                if (eventType == "load") {
                    onLoadMethods.push(()=>htmlElement._exec(method, { event, element: htmlElement }));
                }
                else e["on"+eventType] = event => htmlElement._exec(method, { event });
            });
        }
        function templateToHTMLElement(template, app, props) {
            if (!Array.isArray(template.contents)) throw new Error("Invalid template");

            return template.contents.map(e => {
                replaceWithImported();
                
                const html = document.createElement(e.tagName ?? "div");

                // Fix this

                initElement(html, template);
                if (typeof html.props == "object" && typeof props == "object") Object.assign(html.props, props);
                // if (typeof html.props == "object" && typeof html.props._exec == "function") html.props._exec();
                console.log(html, template)
                if (typeof e.attributes == "object") {
                    for (const [key, value] of Object.entries(e.attributes)) {
                        html.setAttribute(key, value);
                    }
                }
                if (typeof e.contents == "string") html.textContent = e.contents;
                else if (Array.isArray(e.contents)) html.replaceChildren(...templateToHTMLElement(e, app, props));
                
                return html;

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
        }
    }
});