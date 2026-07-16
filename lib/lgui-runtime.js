class LGUIComponent {
    #parent;
    #root;
    #args;
    #children = [];
    #path;

    constructor(object, parent, root, args = {}) {
        this._instanceOf = object._instanceOf ?? "anonymous";
        this.#parent = parent;
        this.#root = root ?? this;
        this.#args = args;
        if (!parent) this.#path = "";
        else this.#path = parent._path+"_"+parent._children.length;

        for (const [key, value] of Object.entries(object)) {
            if (typeof value == "function") {
                this[key] = value.bind(this);
                this[key].toString = (args) => `root._getInstance('${this.#path}').${key}({ event${ args ? ", "+Object.keys(args).map(e => e+": "+args[e]).join(", ") : ""} })`;
            }
            else this[key] = value;
        }

        if (typeof this.onrender != "function") throw new Error(`${ this._instanceOf } : has no onrender method`);
        if (typeof this.onmount == "function") this.onmount();
    }

    get _args() {
        return this.#args;
    }
    get _root() {
        return this.#root;
    }
    get _children() {
        return this.#children;
    }
    get _parent() {
        return this.#parent;
    }
    get _path() {
        return this.#path;
    }

    _update() {
        if (typeof document == "undefined") throw new Error("Cannot update component without the DOM");
        const container = this._getContainer();
        const focusPath = window.getElPath(document.activeElement, container);
        this.#children.forEach(e => e._recursiveCall("onunmount"));
        this.#children = [];
        container.innerHTML = container.innerHTML.replace(RegExp(`<!--${this.#path}-->[\\s\\S]*<!--\\/${this.#path}-->`, "gm"), this.toString());
        container.querySelector(focusPath)?.focus();
        this.#children.forEach(e => e._recursiveCall("ondone"));
        if (typeof this.onupdate == "function") this.onupdate();
    }
    _updateInElement(element) {
        if (typeof document == "undefined") throw new Error("Cannot update component without the DOM");
        if (!(element instanceof HTMLElement)) throw new Error("Element param must be an HTMLElement instance");
        const container = element;
        const focusPath = window.getElPath(document.activeElement, container);
        this.#children.forEach(e => e._recursiveCall("onunmount"));
        this.#children = [];
        container.innerHTML = this.onrender(this.#args);
        container.querySelector(focusPath)?.focus();
        this.#children.forEach(e => e._recursiveCall("ondone"));
        if (typeof this.onupdate == "function") this.onupdate();
    }
    _use(component, args = {}) {
        console.log(component);
        if (typeof component != "object" || Array.isArray(component) || component == null) return null;
        const instance = new LGUIComponent(component, this, this.#root, args);
        if (typeof args._ref == "string") this[args._ref] = instance;
        this.#children.push(instance);
        return instance;
    }
    _ref (name) {
        const id = this.#path+"_"+name;
        if (typeof this[name] == "undefined") Object.defineProperty(this, name, { get: () => document.getElementById(id) });
        return id;
    }
    _getContainer() {
        if (typeof document == "undefined") return null;
        let container = document.body;
        let length = document.body.innerHTML.length;
        for (const element of (this.#parent?._getContainer() ?? document.body).querySelectorAll("*")) {
            if (element.innerHTML.includes(`<!--${this.#path}-->`) && element.innerHTML.length < length){
                container = element;
                length = container.innerHTML.length;
            }
        }
        return container;
    }
    _recursiveCall(name) {
        if (name == "_recursiveCall") throw new Error(`${this._instanceOf} : cannot _recursiveCall(_recursiveCall)`);
        if (typeof this[name] == "function") this[name]();
        this._children.forEach(e => e._recursiveCall(name));
    }
    _getInstance(pathToInstance) {
        if (!pathToInstance) return this;
        pathToInstance = pathToInstance.split("_").slice(1);
        let component = this;
        for (let i = 0; i < pathToInstance.length; i++) {
            component = component._children[pathToInstance[i]];
            if (!component) return null;
        }
        return component;
    }
    toString() {
        const rendered = this.onrender(this.#args);
        if (typeof rendered != "string") throw new Error(`${this._instanceOf} : onrender must return a string, got `+rendered);
        return `<!--${this.#path}-->${ rendered }<!--/${this.#path}-->`;
    }
}

for (const [key, value] of Object.entries(_lgui_components)) {
    _lgui_components[key] = value();
    _lgui_components[key]._instanceOf = key;
}
console.log(_lgui_components);
export const root = new LGUIComponent(Object.values(_lgui_components)[0]);

if (typeof document != "undefined" && typeof _lgui_components != "undefined") {
    document.addEventListener("DOMContentLoaded", function() {
        window.getElPath = (el, container) => {
            const stack = [];
            while (el.parentElement != null) {
                if ( el.hasAttribute('id') && el.id != '' ) stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
                else stack.unshift(el.nodeName.toLowerCase() + ':nth-child(' + (Array.from(el.parentElement.children).findIndex(e => e == el) + 1) + ')');
                el = el.parentElement;
                if (el.parentElement == container) break;
            }

            if (stack.length == 0) return "";
            else if (stack[stack.length - 1].includes("#")) return stack[stack.length - 1];
            return stack.join(" > ");
        };

        window.root = root;
        root.onrender({ path: window.location.pathname });
        root._recursiveCall("onload");
        root._recursiveCall("ondone");
    });
}