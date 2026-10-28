import lang from "./multilingualization.js";
import "./common.js";

window.onload = () => {
    if (location.hash.includes(",")) {
        const [fileName, zip] = location.hash.slice(1).split(",");
        const link = _$("download_file");
        link.href = `data:application/zip;base64,${zip}`;
        link.download = decodeURIComponent(fileName);
        link.textContent = `${lang.translate("dict-25")}: ${link.download}`;
        link.hidden = false;
        document.title = `${lang.translate("dict-25")} - QR code Generator`;
        return;
    }

    // Initialized by URL parameter
    const obj = getUrlParams();

    if (obj) {
        _$('chkIsSjis').checked = obj['chkIsSjis'] ? true : false;

        // set default value once only
        // setTimeout is an autocomplete countermeasure
        setTimeout(() => {
            for (const key of Object.keys(obj)) {
                if (_$(key) !== null && _$(key).type?.match(/hidden|checkbox/)) {
                    _$(key).value = obj[key];
                    console.log(`${key}: ${obj[key]}`);
                }
            }

            downloadVcardFile();
        }, 100);
    }
};
