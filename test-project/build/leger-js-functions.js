function render(template, params = {}) {
    if (typeof(params) != "object") throw new Error("Invalid rendering params !");
    if (Array.isArray(params)) {
        let html = "";
        params.forEach(element => {
            let htmlElement = template;
            for (const [key, value] of Object.entries(element)) {
                htmlElement = htmlElement.replaceAll("$$"+key+";", value);
            }
            html += htmlElement+"\n";
        });
        return html;
    } else {
        let html = template;
        for (const [key, value] of Object.entries(params)) {
            html = html.replaceAll("$$"+key+";", value);
        }
        return html;
    }
}