import lang from "./multilingualization.js";
import "./common.js";

/**
 * Copying URLs with initial values
 */
async function copyUrlWithValues() {
    let params = [];
    const elems = Object.setPrototypeOf([...$$('input[type="text"]'), ...$$('input[type="password"]'), ...$$('textarea')], NodeList.prototype);

    for (const elem of elems) {
        if (elem?.value) {
            params.push(`${elem.id}=${encodeURIComponent(elem.value)}`);
        }
    }
    for (const elem of $$('input[type="checkbox"]')) {
        if (elem?.checked) {
            params.push(`${elem.id}=${encodeURIComponent(1)}`);
        }
    }

    const url = `${location.protocol}://${location.host}${location.pathname}?${params.join("&")}`;
    console.log(url);

    try {
        await navigator.clipboard.writeText(url);
        toastr.success(lang.translate('success-1'));
    } catch (error) {
        toastr.success(lang.translate('error-2'));
    }
}

// After drawing the screen, perform the initial setup.
window.onload = () => {
    _$("btnGen").addEventListener("click", async e => {
        const size = 200; // QR Code image size (both portrait and landscape)
        let source = "";

        // Change the value to be retrieved depending on the tab being displayed.
        switch ($$(".nav-link.active")[0].getAttribute("value")) {
            case "free_text":
                source = encode(_$("text").value);
                break

            case "url":
                source = encode(_$("basic-url").value);
                break

            case "wifi":
                const essid = _$("essid").value
                const password = _$("password").value
                source = `WIFI:T:WPA;S:${essid};P:${password};;`;
                break

            case "vcard":
                source = encode(generateVcard());
                break

            case "file":
                try {
                    if (!_$("file_name").reportValidity()) {
                        return;
                    }
                    const archiveName = `${_$("file_name").value}.zip`;
                    const fileName = new TextEncoder().encode(_$("file_name").value);
                    const contents = new TextEncoder().encode(_$("file_contents").value);
                    const stream = new Blob([contents]).stream()
                        .pipeThrough(new CompressionStream("deflate-raw"));
                    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
                    const method = compressed.length < contents.length ? 8 : 0;
                    const data = method === 8 ? compressed : contents;
                    let crc = 0xffffffff;
                    for (const byte of contents) {
                        crc ^= byte;
                        for (let bit = 0; bit < 8; bit++) {
                            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
                        }
                    }
                    crc = (crc ^ 0xffffffff) >>> 0;

                    const directoryOffset = 30 + fileName.length + data.length;
                    const endOffset = directoryOffset + 46 + fileName.length;
                    const zip = new Uint8Array(endOffset + 22);
                    const header = new DataView(zip.buffer);

                    // ZIP local header.
                    header.setUint32(0, 0x04034b50, true);
                    header.setUint16(4, 20, true);
                    header.setUint16(6, 0x0800, true);
                    header.setUint16(8, method, true);
                    header.setUint16(12, 0x0021, true);
                    header.setUint32(14, crc, true);
                    header.setUint32(18, data.length, true);
                    header.setUint32(22, contents.length, true);
                    header.setUint16(26, fileName.length, true);
                    zip.set(fileName, 30);
                    zip.set(data, 30 + fileName.length);

                    // Central directory shares the local header's file metadata.
                    header.setUint32(directoryOffset, 0x02014b50, true);
                    header.setUint16(directoryOffset + 4, 20, true);
                    zip.set(zip.subarray(4, 30), directoryOffset + 6);
                    zip.set(fileName, directoryOffset + 46);

                    // End of central directory.
                    header.setUint32(endOffset, 0x06054b50, true);
                    header.setUint16(endOffset + 8, 1, true);
                    header.setUint16(endOffset + 10, 1, true);
                    header.setUint32(endOffset + 12, 46 + fileName.length, true);
                    header.setUint32(endOffset + 16, directoryOffset, true);

                    const base64 = btoa(Array.from(zip, byte => String.fromCharCode(byte)).join(""));
                    const downloadUrl = new URL("dl/", location.href);
                    downloadUrl.hash = `${encodeURIComponent(archiveName)},${base64}`;
                    source = downloadUrl.href;
                } catch (e) {
                    $("#QRCode").html("").append(lang.translate("error-3"));
                    return;
                }
                break
        }
        console.log(source)

        // QR Code generation
        try {
            const strlen = source.length;
            $("#QRCode").html("").qrcode({
                width: strlen > size ? strlen : size,
                height: strlen > size ? strlen : size,
                text: source,
            });
        } catch (e) {
            $("#QRCode").html("").append(lang.translate("error-1"));
        }
    });

    // The use of the function is discontinued because personal
    // information remains in the web server's access log.
    // // Copying URLs with initial values
    // _$("btnUrl").addEventListener("click", e => {
    //     copyUrlWithValues();
    // });

    // Download vCard
    _$("btnVcard").addEventListener("click", e => {
        downloadVcardFile();
    });

    // Tab Switching
    for (const nav_elem of $$(".nav-link")) {
        nav_elem.addEventListener("click", event => {
            for (const elem of $$(".nav-link")) {
                elem.classList.remove("active")
            }
            for (const elem of $$(".tab")) {
                elem.classList.add("d-none")
            }
            event.target.classList.add("active")
            _$(event.target.getAttribute("value")).classList.remove("d-none")

            if (event.target.getAttribute("value") === "vcard") {
                _$("btnVcard").disabled = false
            } else {
                _$("btnVcard").disabled = true
            }
        });
    };



    // Initialized by URL parameter
    const obj = getUrlParams();

    // set default value once only
    // setTimeout is an autocomplete countermeasure
    setTimeout(() => {
        for (const key of Object.keys(obj)) {
            if (_$(key) !== null && _$(key).type?.match(/text|password/)) {
                _$(key).value = obj[key];
                console.log(`${key}: ${obj[key]}`);
            }
        }
    }, 100);

    // tab activate
    const key = Object.keys(obj)[0];
    if (key == false) {
        // nop
    } else if (key.match(/text/)) {
        _$("tab_free_text").click();
    } else if (key.match(/basic-url/)) {
        _$("tab_url").click();
    } else if (key.match(/essid|password/)) {
        _$("tab_wifi").click();
    } else if (key.match(/first_name|family_name|first_name_kana|family_name_kana|organization|title|tel_voice|tel_fax|email|url_work|url_private/)) {
        _$("tab_vcard").click();
    }



    // multilingualization
    lang.translateAll();
};
