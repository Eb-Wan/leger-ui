import { checkTypeOfLdxElement, ldxElementToProp } from "./ldx-props.js";

function ldxPreprocessor(imported) {
    imported.forEach(e => {
        if (!e.props) e.props = {};
        preprocessElement(e, e.props);
    });
    return imported;
    
    function preprocessElement(ldxElement, props) {
        try {
            if (!ldxElement || !Array.isArray(ldxElement.contents)) return;
            for (let i = 0; i < ldxElement.contents.length; i++) {
                const e = ldxElement.contents[i];
                if (Array.isArray(e.contents)) {
                    preprocessElement(e, props);
                    return;
                }

                if (!checkTypeOfLdxElement(e)) continue;
                
                const prop = ldxElementToProp(e);
                if (!prop) continue;
    
                Object.assign(props, prop);
                const index = ldxElement.contents.findIndex(f => f == e);
                if (index > -1) ldxElement.contents.splice(index, 1);
                i--;
            }
            return;
        } catch (error) {
            throw error;
        }
    }
}

export { ldxPreprocessor };