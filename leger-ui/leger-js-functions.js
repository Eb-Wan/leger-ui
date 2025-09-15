// Custom Software License for leger-ui
// Copyright (c) 2025 Eb-Wan
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to use, copy, modify, merge, publish, and distribute copies of the Software, subject to the following conditions:
// 
// 1. No Resale
// You may not sell, license, or otherwise commercially distribute the Software or any derivative works thereof. The Software and any modifications or forks thereof must only be distributed free of charge.
// 
// 2. Credit to Original Author on Redistribution or Fork
// If you redistribute, fork, or otherwise publicly share the Software itself (including modified versions), you must include clear and visible credit to the original author: Eb-Wan. This credit must appear in:
// 
// - Documentation accompanying the redistributed Software.
// - Any public-facing materials related specifically to the redistributed or forked Software.
// 
// Note:  
// If you use the Software to build a website, application, or other product, you do **not** need to provide credit to the original author for your product.
// 
// 3. Disclaimer
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// 
// ---
// 
// This license applies specifically to the leger-ui web frontend compiler.
// 

// function render(template, params = {}) {
//     if (typeof(params) != "object") throw new Error("Invalid rendering params !");
//     if (Array.isArray(params)) {
//         let html = "";
//         params.forEach(p => html += compileTemplate(template, p));
//         return html;
//     } else return compileTemplate(template, params);

//     function compileTemplate(template, params) {
//         let html = template;
//         for (const [key, value] of Object.entries(params)) {
//             html = html.replaceAll("$$"+key+";", value);
//         }
//         return html + "\n";
//     }
// }

function render(template, params = {}) {
    if (typeof(params) != "object") throw new Error("Invalid rendering params !");
    if (Array.isArray(params)) {
        let html = "";
        params.forEach(p => html += compileTemplate(template, p));
        return html;
    } else return compileTemplate(template, params);

    function compileTemplate(template, params) {
        let html = template;
        let regex = /\$\$/;
        
        let expressionIndex = html.search(regex);
        while(expressionIndex != -1) {
            const { extracted, parsed } = parseExpression(expressionIndex, html);
            extractedExpression = extracted;
            try {
                const result = resolve(parsed, params);
                html = html.replaceAll(extracted, result);
            } catch (error) {
                console.error(`Invalid param "${extracted}" !`);                
                html = html.replaceAll(extracted, `[Invalid Param]`);
            }
            expressionIndex = html.search(regex);
        }
        return html + "\n";
    }

    function parseExpression(index, template) {
        let extracted = "$$";
        let parsed = [];
        let key = "";
        index += 2;
        while(1) {
            const current = template[index];
            extracted += current;
            index++;
            
            if (current == ".") {
                parsed.push(key);
                key = "";
            } else if (current == ";") {
                parsed.push(key);
                break;
            } else key += current;
            if (index >= template.length) throw new Error("Missing semi-colon !");
        }
        return { extracted, parsed };
    }
    function resolve(parsed, params) {
        let value = params;
        parsed.forEach(e =>{
            if (!value) value = undefined;
            else value = value[e];
        });
        if (!value) throw new Error();
        return value;
    }
}