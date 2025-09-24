const date = () => {
    const now = new Date();
    return now.toLocaleDateString();
}
const declare = ({ id, value }, pageData) => {
    pageData.variables.push({ id, value });
    return "";
}
const define = ({ id, value }, pageData) => {
    pageData.globalParamsList.push({ id, value });
    return "";
}
const include = ({ id, path }, pageData) => {
    if (path.includes("css")) pageData.importedCss.push({ id, path });
    else pageData.importedScripts.push({ id, path });
    return "";
}
const lorem = () => "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut ultricies enim. Donec accumsan feugiat aliquet. Nam rhoncus non massa in tristique. Quisque molestie est.";

const commands = [
    { id: "date", method: date },
    { id: "define", method: define },
    { id: "declare", method: declare },
    { id: "import", method: include },
    { id: "lorem", method: lorem }
];

module.exports = commands;