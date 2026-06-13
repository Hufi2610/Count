const API_URL =
    "https://script.google.com/macros/s/AKfycbw1OGmEdgI1xLTnwKd0Qfhu9-NEdyFBF9U_JOc7MD2XZ_N1O7ZCwJ8ev4kMO7qMnr7U/exec";

let products = [];
let historyData = [];
let selectedProduct = null;
let editingId = null;

let html5QrCode = null;

let scannerTarget = null;
let scannerRunning = false;
let currentVersion = 0;
let DEVICE_ID =
    localStorage.getItem("DEVICE_ID");

if (!DEVICE_ID) {

    DEVICE_ID =
        crypto.randomUUID();

    localStorage.setItem(
        "DEVICE_ID",
        DEVICE_ID
    );

}

const entryForm =
    document.getElementById("entryForm");

const entryId =
    document.getElementById("entryId");

const locationInput =
    document.getElementById("location");

const barcodeInput =
    document.getElementById("barcode");

const quantityEa =
    document.getElementById("quantityEa");

const expiryDate =
    document.getElementById("expiryDate");

const txtProductCode =
    document.getElementById("txtProductCode");

const txtProductDesc =
    document.getElementById("txtProductDesc");

const txtSpecification =
    document.getElementById("txtSpecification");

const txtQuantityCs =
    document.getElementById("txtQuantityCs");

const datePreview =
    document.getElementById("datePreview");

const recentEntriesTable =
    document.getElementById("recentEntriesTable");

recentEntriesTable.innerHTML = `
<tr>
    <td colspan="6">
        Đang tải dữ liệu...
    </td>
</tr>
`;

const btnCancel =
    document.getElementById("btnCancel");

const scannerOverlay =
    document.getElementById("scannerOverlay");

const scannerViewport =
    document.getElementById("scannerViewport");

const btnCloseScanner =
    document.getElementById("btnCloseScanner");

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        generateNewId();

        loadCachedHistory();

        await loadProducts();

        await loadLatest();

        startRealtimePolling();

    });

function generateId() {

    return crypto.randomUUID();

}

function generateNewId() {

    editingId = null;

    entryId.value =
        generateId();

}

async function loadProducts() {

    try {

        const res =
            await fetch(
                "data.json",
                {
                    cache: "force-cache"
                }
            );

        products =
            await res.json();

    }
    catch (err) {

        console.error(err);

    }

}

function validateLocation(value) {

    const regex =
        /^([A-Z]{2})-(\d{3})-(\d{2})$/;

    const match =
        value.match(regex);

    if (!match)
        return false;

    const rack =
        parseInt(match[2], 10);

    const level =
        parseInt(match[3], 10);

    return rack >= 1 &&
        rack <= 32 &&
        level >= 1 &&
        level <= 6;

}

locationInput.addEventListener(
    "input",
    () => {

        locationInput.value =
            locationInput.value.toUpperCase();

    });

function validateDate(raw) {

    if (raw === "31129999") {

        return {

            valid: true,

            formatted:
                "31.12.9999"

        };

    }

    if (raw.length !== 8) {

        return {

            valid: false

        };

    }

    const day =
        Number(raw.substring(0, 2));

    const month =
        Number(raw.substring(2, 4));

    const year =
        Number(raw.substring(4, 8));

    const d =
        new Date(
            year,
            month - 1,
            day
        );

    const valid =
        d.getDate() === day &&
        d.getMonth() === month - 1 &&
        d.getFullYear() === year;

    if (!valid) {

        return {

            valid: false

        };

    }

    return {

        valid: true,

        formatted:
            `${raw.substring(0, 2)}.${raw.substring(2, 4)}.${raw.substring(4, 8)}`

    };

}

expiryDate.addEventListener(
    "input",
    () => {

        const result =
            validateDate(
                expiryDate.value
            );

        if (result.valid) {

            expiryDate.classList.remove(
                "input-error"
            );

            datePreview.textContent =
                result.formatted;

        }
        else {

            expiryDate.classList.add(
                "input-error"
            );

            datePreview.textContent =
                "--.--.----";

        }

    });

function searchBarcode(code) {

    selectedProduct =
        products.find(item =>

            item.BARCODE.some(

                b =>
                    String(b) ===
                    String(code)

            )

        );

    if (!selectedProduct) {

        txtProductCode.textContent =
            "---";

        txtProductDesc.textContent =
            "Không tìm thấy";

        txtSpecification.textContent =
            "---";

        return;

    }

    txtProductCode.textContent =
        selectedProduct.ARTCEXR;

    txtProductDesc.textContent =
        selectedProduct.TSOBDESC;

    txtSpecification.textContent =
        `${selectedProduct["MU/CS"]} EA/CS`;

    calculateCS();

}

barcodeInput.addEventListener(
    "input",
    () => {

        searchBarcode(
            barcodeInput.value.trim()
        );

    });

function calculateCS() {

    if (!selectedProduct)
        return;

    const qty =
        Number(
            quantityEa.value || 0
        );

    const mucs =
        Number(
            selectedProduct["MU/CS"]
        );

    const cs =
        qty / mucs;

    txtQuantityCs.textContent =
        `${cs.toFixed(2)} CS`;

}

quantityEa.addEventListener(
    "input",
    calculateCS
);
const video =
    document.querySelector(
        "#reader video"
    );

if (video) {

    video.style.objectFit =
        "cover";

}
function loadCachedHistory() {

    try {

        const cached =
            localStorage.getItem(
                "LATEST_DATA"
            );

        if (!cached)
            return false;

        historyData =
            JSON.parse(cached);

        renderHistory();

        return true;

    }
    catch (err) {

        console.error(err);

        return false;

    }

}



async function loadLatest() {

    try {

        const res =
            await fetch(
                API_URL +
                "?action=latest&t=" +
                Date.now()
            );

        const result =
            await res.json();

        if (
            !result ||
            !result.version
        ) {
            return;
        }

        if (
            result.version !==
            currentVersion
        ) {

            currentVersion =
                result.version;

            historyData =
                (result.data || []).map(item => ({
                    ...item,

                    exp:
                        formatDate(item.exp)

                }));

            localStorage.setItem(
                "LATEST_DATA",
                JSON.stringify(historyData)
            );


            renderHistory();

        }

    }
    catch (err) {

        console.error(err);

    }

}
function startRealtimePolling() {

    setInterval(
        loadLatest,
        3000
    );

}

/* ==========================
   SCANNER
========================== */

function openScanner(target) {

    scannerTarget = target;

    scannerOverlay.classList.remove("hidden");

    startScanner();
}

async function closeScanner() {

    scannerOverlay.classList.add(
        "hidden"
    );

    await stopScanner();

}

function handleScan(code) {

    if (!scannerTarget)
        return;

    scannerTarget.value = code;

    scannerTarget.dispatchEvent(
        new Event("input")
    );

}
async function startScanner() {

    if (scannerRunning)
        return;

    try {

        scannerRunning = true;

        scannerViewport.innerHTML =
            '<div id="reader" style="width:100%;height:100%"></div>';

        html5QrCode =
            new Html5Qrcode(
                "reader",
                {
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8
                    ]
                }
            );

        const devices =
            await Html5Qrcode.getCameras();

        if (!devices || devices.length === 0) {

            throw "No camera found";

        }

        let cameraId =
            devices[0].id;

        /* ưu tiên camera sau */

        const backCamera =
            devices.find(device =>

                /back|rear|environment/i.test(
                    device.label
                )

            );

        if (backCamera) {

            cameraId =
                backCamera.id;

        }

        await html5QrCode.start(

            cameraId,

            {
        {
                fps: 15,

                qrbox: {
                    width: 300,
                    height: 150
                },

                videoConstraints: {

                    facingMode: "environment",

                    width: {
                        ideal: 1920
                    },

                    height: {
                        ideal: 1080
                    }

                }
            },

            (decodedText) => {

                handleScan(decodedText);

                closeScanner();

            }

        );
    }
    catch (err) {

        console.error(
            "Scanner Error:",
            err
        );

        scannerRunning = false;

        alert(
            "Không mở được camera"
        );

    }

}
document
    .querySelectorAll(".btn-scan")
    .forEach(btn => {

        btn.addEventListener(
            "click",
            () => {

                const target =
                    document.getElementById(
                        btn.dataset.target
                    );

                openScanner(target);

            });

    });
async function stopScanner() {

    try {

        if (html5QrCode) {

            await html5QrCode.stop();

            await html5QrCode.clear();

            html5QrCode = null;

        }

    }
    catch (err) {

        console.error(err);

    }

    scannerViewport.innerHTML = "";

    scannerRunning = false;

    scannerTarget = null;

}
btnCloseScanner.addEventListener(
    "click",
    function (e) {

        e.preventDefault();

        e.stopPropagation();

        closeScanner();

    });
/* ==========================
   COLLECT DATA
========================== */

function collectData() {

    if (
        !validateLocation(
            locationInput.value
        )
    ) {

        alert(
            "Location không hợp lệ"
        );

        return null;

    }

    if (!selectedProduct) {

        alert(
            "Chưa chọn sản phẩm"
        );

        return null;

    }

    const dateResult =
        validateDate(
            expiryDate.value
        );

    if (!dateResult.valid) {

        alert(
            "Hạn sử dụng sai"
        );

        return null;

    }

    const qty =
        parseInt(
            quantityEa.value || 0
        );

    const csQty =
        qty /
        Number(
            selectedProduct["MU/CS"]
        );

    return {

        id:
            editingId ||
            entryId.value,

        deviceId:
            DEVICE_ID,

        location:
            locationInput.value,

        barcode:
            barcodeInput.value.trim(),

        article:
            selectedProduct.ARTCEXR,

        description:
            selectedProduct.TSOBDESC,

        qty,

        csQty:
            Number(
                csQty.toFixed(2)
            ),

        exp:
            dateResult.formatted

    };

}

/* ==========================
   SAVE
========================== */

entryForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const data =
            collectData();

        if (!data)
            return;

        /* cập nhật UI ngay */

        optimisticUpdate(data);

        /* reset form ngay */

        clearForm();

        /* gửi nền */

        saveToSheet(data)
            .catch(err => {

                console.error(
                    "Save Error:",
                    err
                );

            });

    });

async function saveToSheet(data) {

    try {

        const res = await fetch(API_URL, {

            method: "POST",

            body: JSON.stringify({

                action: "save",

                ...data

            })

        });

        const result =
            await res.json();

        console.log(
            "SAVE RESULT",
            result
        );

        return result;

    }
    catch (err) {

        console.error(
            "SAVE ERROR",
            err
        );

        throw err;

    }

}

/* ==========================
   OPTIMISTIC UPDATE
========================== */

function optimisticUpdate(data) {

    const index =
        historyData.findIndex(
            x =>
                x.id === data.id
        );

    if (index >= 0) {

        historyData[index] =
            data;

    }
    else {

        historyData.unshift(
            data
        );

        if (
            historyData.length > 20
        ) {

            historyData.pop();

        }

    }

    renderHistory();

}

/* ==========================
   HISTORY
========================== */

function renderHistory() {

    if (
        historyData.length === 0
    ) {

        recentEntriesTable.innerHTML =
            `
        <tr>
            <td colspan="6">
                Chưa có dữ liệu
            </td>
        </tr>
        `;

        return;

    }

    recentEntriesTable.innerHTML =
        historyData.map(item => `

        <tr
            class="history-row"
            data-id="${item.id}"
        >

            <td>
                ${item.location}
            </td>

            <td>
                ${item.article}
            </td>

            <td>
                ${item.description}
            </td>

            <td>
                ${item.qty}
            </td>

            <td>
                ${item.csQty}
            </td>

            <td>
                ${item.exp}
            </td>

        </tr>

    `).join("");

    bindHistoryClick();

}

function bindHistoryClick() {

    document
        .querySelectorAll(
            ".history-row"
        )
        .forEach(row => {

            row.onclick = () => {
                const item = historyData.find(
                    x => String(x.id) === String(row.dataset.id)
                );

                if (item) {

                    editItem(item);

                }

            };

        });

}

/* ==========================
   EDIT
========================== */

function editItem(item) {

    editingId =
        item.id;

    entryId.value =
        item.id;

    locationInput.value =
        item.location;

    barcodeInput.value =
        item.article;

    searchBarcode(
        item.article
    );

    quantityEa.value =
        item.qty;

    calculateCS();

    expiryDate.value =
        item.exp.replaceAll(
            ".",
            ""
        );

    datePreview.textContent =
        item.exp;

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

/* ==========================
   CLEAR FORM
========================== */

function clearForm() {

    entryForm.reset();

    editingId = null;

    selectedProduct = null;

    txtProductCode.textContent =
        "---";

    txtProductDesc.textContent =
        "---";

    txtSpecification.textContent =
        "---";

    txtQuantityCs.textContent =
        "0 CS";

    datePreview.textContent =
        "--.--.----";

    generateNewId();

}

/* ==========================
   CANCEL
========================== */

btnCancel.addEventListener(
    "click",
    clearForm
);

/* ==========================
   SCROLL TOP
========================== */

const btnScrollTop =
    document.getElementById(
        "btnScrollTop"
    );

window.addEventListener(
    "scroll",
    () => {

        if (
            window.scrollY > 300
        ) {

            btnScrollTop.classList.remove(
                "hidden"
            );

        }
        else {

            btnScrollTop.classList.add(
                "hidden"
            );

        }

    });

btnScrollTop.addEventListener(
    "click",
    () => {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });
function formatDate(value) {

    if (!value) return "";

    const d = new Date(value);

    if (isNaN(d)) return value;

    const day =
        String(d.getDate())
            .padStart(2, "0");

    const month =
        String(d.getMonth() + 1)
            .padStart(2, "0");

    const year =
        d.getFullYear();

    return `${day}.${month}.${year}`;

}
