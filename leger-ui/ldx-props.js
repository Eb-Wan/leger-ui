const ldxTypes = [ "num", "str", "bool", "func", "style", "template" ];

function ldxElementToProp(e) {
    if (typeof e != "object" || Array.isArray(e)) return;
    if (!e.attributes.name) throw new Error("Unamed element");
    if (e.tagName == "num") return { [e.attributes.name] : { type: "num", value: e.attributes.value ?? "0" } };
    else if (e.tagName == "str") return { [e.attributes.name] : { type: "str", value: e.attributes.value ?? "" } };
    else if (e.tagName == "bool") return { [e.attributes.name] : { type: "bool", value: e.attributes.value == "true" ? true : false } };
    else if (e.tagName == "func") return { [e.attributes.name] : { type: "func", value: e.contents ?? "return" } };
    else if (e.tagName == "template") return { [e.attributes.name] : { type: "template", value: e.attributes.path ?? "" } };
}

function checkTypeOfLdxElement(e) {
    if (typeof e != "object" || Array.isArray(e)) return;
    return ldxTypes.includes(e.tagName ?? "") ? e.tagName : false;
}

export { ldxTypes, checkTypeOfLdxElement, ldxElementToProp };