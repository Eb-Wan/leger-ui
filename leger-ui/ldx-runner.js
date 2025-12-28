
export class LdxAppElement {
    constructor(parent, ldxElement) {
        this._parent = parent;
        this._children = [];
        this._id = this._parent ? this._parent._children.length : 0;
        this._path = this.getPath().join(".");
        this._ldx = ldxElement;
    }
    getPath() {
        if (!this._parent) return [];
        const arr = this._parent.getPath();
        arr.push(this._id);
        return arr;
    }
    use(pathToLdx) {
        const ldx = app[pathToLdx];
        if (!ldx) throw new Error("No ldx element found for path: " + pathToLdx);
        const ldxElement = new LdxAppElement(this, ldx);
        this._children.push(ldxElement);
        const boundLdx = ldx.bind(ldxElement);
        boundLdx.toString = boundLdx;
        return boundLdx;
    }
    onload(callback) {
        if (typeof this_onload == "function") return "";
        this._onload = callback;
        return "";
    }
    def(name, value) {
        if (typeof this[name] != "undefined") return "";
        const protectedProperties = ["_parent", "_children", "_id", "getPath", "use", "onload", "def"];
        if (protectedProperties.includes(name)) {
            console.error("Cannot define protected property: " + name);
            return "";
        }
        if (typeof value === "function") {
            value = value.bind(this);
            value.toString = () => `window.getInstance('${this._path}', window.appTree).${name}()`;
        }
        this[name] = value;
        return "";
    }
    render() {
        if (typeof document == "undefined") return "";

        // Quite inneficient
        document.body.innerHTML = document.body.innerHTML.replace(RegExp(`<!-- ${this._path} -->.*<!-- /${this._path} -->`, "m"), this._ldx.call(this));
    }
}

export function getInstance(pathToInstance, appTree) {
    pathToInstance = pathToInstance.split(".");
    for (let i = 0; i < pathToInstance.length; i++) {
        appTree = appTree._children[pathToInstance[i]];
        if (!appTree) return null;
    }
    return appTree;
}

if (typeof document != "undefined") {
    document.addEventListener("DOMContentLoaded", function() {
        let pageRoute = window.location.pathname.split(".")[0];
        if (pageRoute == "/") pageRoute = "index.ldx";
        pageRoute = pageRoute.replace(/^\/+|\/+$/g, "").split(".")[0]+".ldx";
        window.appTree = new LdxAppElement();
        window.appTree.use(pageRoute)();
        window.getInstance = getInstance;
        onLoadTrigger(window.appTree);
    });

    function onLoadTrigger(appTree) {
        if (typeof appTree._onload == "function") appTree._onload();
        for (let i = 0; i < appTree._children.length; i++) {
            onLoadTrigger(appTree._children[i]);
        }
    }
}