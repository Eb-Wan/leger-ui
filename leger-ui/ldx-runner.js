
export class LdxAppElement {
    constructor(parent) {
        this._parent = parent;
        this._children = [];
        this._id = this._parent ? this._parent._children.length : 0;
        this._path = this.getPath().join(".");
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
        const ldxElement = new LdxAppElement(this)
        this._children.push(ldxElement);
        ldx.toString = ldx.bind(ldxElement);
        return ldx.bind(ldxElement);
    }
    onload(callback) {
        this.onload = callback;
        return "";
    }
    def(name, value) {
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
        window.appTree = new LdxAppElement();
        window.appTree.use(pageRoute)();
        window.getInstance = getInstance;
    });
}