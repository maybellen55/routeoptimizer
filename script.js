// =====================================
// Route Optimizer (Loop Version)
// =====================================

// ----------------------
// DOM
// ----------------------

const addButton = document.getElementById("addStop");
const optimizeButton = document.getElementById("optimize");
const destinationsEl = document.getElementById("destinations");
const resultEl = document.getElementById("result");
const openGoogleBtn = document.getElementById("openGoogle");

// ----------------------
// init
// ----------------------

destinationsEl.innerHTML = "";
addInput();

// ----------------------
// input row
// ----------------------

function addInput(value = "") {

    const row = document.createElement("div");
    row.className = "destination-row";

    row.innerHTML = `
        <input type="text" class="destination" placeholder="住所を入力" value="${value}">
        <button class="remove-btn">✕</button>
    `;

    row.querySelector(".remove-btn").addEventListener("click", () => {
        const rows = document.querySelectorAll(".destination-row");
        if (rows.length === 1) return alert("最低1件は必要です");
        row.remove();
    });

    row.querySelector("input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addInput();
        }
    });

    destinationsEl.appendChild(row);
}

// ----------------------
// add button
// ----------------------

addButton.addEventListener("click", () => {
    addInput();
});

// ----------------------
// get inputs
// ----------------------

function getInputs() {

    const start = document.getElementById("start").value.trim();

    const destinations = [...document.querySelectorAll(".destination")]
        .map(i => i.value.trim())
        .filter(v => v !== "");

    return { start, destinations };
}

// ----------------------
// geocode (Photon)
// ----------------------

async function geocode(address) {

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
        throw new Error("見つかりません: " + address);
    }

    const p = data.features[0];

    return {
        lat: p.geometry.coordinates[1],
        lon: p.geometry.coordinates[0],
        name: address
    };
}

// ----------------------
// geocode all
// ----------------------

async function geocodeAll(list) {

    const results = [];

    for (let addr of list) {

        try {
            const loc = await geocode(addr);
            results.push(loc);
        } catch (e) {
            alert(e.message);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    return results;
}

// ----------------------
// distance (Haversine)
// ----------------------

function distance(a, b) {

    const R = 6371;

    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;

    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLon / 2) ** 2 *
        Math.cos(lat1) *
        Math.cos(lat2);

    return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

// ----------------------
// optimize (nearest neighbor)
// ----------------------

function optimize(points) {

    if (points.length <= 2) return points;

    const result = [];
    const rest = [...points];

    let current = rest.shift();
    result.push(current);

    while (rest.length > 0) {

        let minIndex = 0;
        let minDist = Infinity;

        for (let i = 0; i < rest.length; i++) {

            const d = distance(current, rest[i]);

            if (d < minDist) {
                minDist = d;
                minIndex = i;
            }
        }

        current = rest.splice(minIndex, 1)[0];
        result.push(current);
    }

    return result;
}

// ----------------------
// Google Maps URL（ループ対応）
// ----------------------

function buildGoogleMap(start, route) {

    let url = "https://www.google.com/maps/dir/";

    url += encodeURIComponent(start) + "/";

    for (let p of route) {
        url += encodeURIComponent(p.name) + "/";
    }

    // 🔥 ここが重要：出発地に戻る
    url += encodeURIComponent(start);

    return url;
}

// ----------------------
// show result
// ----------------------

function show(route) {

    resultEl.innerHTML = "";

    route.forEach((p, i) => {

        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${p.name}`;
        resultEl.appendChild(li);
    });
}

// ----------------------
// main
// ----------------------

optimizeButton.addEventListener("click", async () => {

    const { start, destinations } = getInputs();

    if (!start) return alert("出発地点を入力してください");
    if (destinations.length === 0) return alert("目的地を入力してください");

    optimizeButton.disabled = true;
    optimizeButton.textContent = "処理中...";

    try {

        const startLoc = await geocode(start);
        const destLocs = await geocodeAll(destinations);

        const route = [startLoc, ...optimize(destLocs)];

        show(route);

        const url = buildGoogleMap(start, route.slice(1));

        if (openGoogleBtn) {
            openGoogleBtn.disabled = false;
            openGoogleBtn.onclick = () => {
                window.open(url, "_blank");
            };
        }

    } catch (e) {
        alert(e.message);
        console.error(e);
    }

    optimizeButton.disabled = false;
    optimizeButton.textContent = "🚗 最適化する";
});