function render(template, params = {}) {
    if (typeof(params) != "object") throw new Error("Invalid rendering params !");
    if (Array.isArray(params)) {
        params.forEach(element => {
            for (const [key, value] of Object.entries(element)) {
                template = template.replaceAll("$$"+key+";", value);
            }
        });
    } else {
        for (const [key, value] of Object.entries(params)) {
            template = template.replaceAll("$$"+key+";", value);
        }
    }
    return template;
}