const map = L.map('map').setView([49.204, 16.605], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const overlayLayer = L.layerGroup().addTo(map);
const networkMarkers = {};
const selectedNetworks = new Set();
const defaultMarkerSize = 5;
const onHoverMarkerSize = 10;
let currentOnHoverMarker = null;
let currentOnHoverRow = null;

function getColorFromBSSID(bssid) {
    let hash = 0;

    for (let i = 0; i < bssid.length; i++) {
        hash = bssid.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).slice(-2);
    }

    return color;
}

async function fetchNetworksInBounds() {
    const bounds = map.getBounds();

    try {
        const response = await fetch(`/networks?swLat=${bounds.getSouthWest().lat}&swLng=${bounds.getSouthWest().lng}&neLat=${bounds.getNorthEast().lat}&neLng=${bounds.getNorthEast().lng}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching networks:", error);
    }
}

function updateTable(networks) {
    const tableBody = document.getElementById('network-table');
    tableBody.innerHTML = '';

    networks.forEach(network => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td class="text-center"><input type="checkbox" data-network-id="${network._id}" ${selectedNetworks.has(network._id) ? 'checked' : ''}></td>
            <td>${network.Ssid}</td>
            <td>${network.Bssid}</td>
            <td>${network.Frequency} MHz</td>
            <td>${network.Capabilities}</td>
        `;

        tableBody.appendChild(row);

        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.onChangeHandler = (checked) => {
            if (checked) {
                selectedNetworks.add(network._id);
                addMarker(network._id);
            } else {
                selectedNetworks.delete(network._id);
                removeMarker(network._id);
            }
        }
        checkbox.onchange = (e) => checkbox.onChangeHandler(e.target.checked);

        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        row.addEventListener('click', () => {
            if (network.Latitude && network.Longitude) {
                checkbox.checked = true;
                checkbox.onChangeHandler(checkbox.checked);
                map.setView([network.Latitude, network.Longitude], 19);
            }
        });

        row.addEventListener('mouseover', () => {
            if (networkMarkers[network._id]) {
                if (currentOnHoverRow != null) {
                    currentOnHoverRow.style.background = "#fff"
                }
                currentOnHoverRow = row;
                currentOnHoverRow.style.background = networkMarkers[network._id].options.color

                if (currentOnHoverMarker) {
                    currentOnHoverMarker.setStyle({
                        radius: defaultMarkerSize
                    });
                }
                currentOnHoverMarker = networkMarkers[network._id];
                currentOnHoverMarker.setStyle({
                    radius: onHoverMarkerSize
                });
            }
        });

        row.addEventListener('mouseout', () => {
            if (networkMarkers[network._id]) {
                networkMarkers[network._id].setStyle({
                    radius: defaultMarkerSize
                });
            }

            row.style.background = "#fff"
        });

        row.style.cursor = 'pointer';
    });
}

function updateMarkers(networks) {
    networks.forEach(network => {
        if (!networkMarkers[network._id]) {
            const networkColor = getColorFromBSSID(network.Bssid);
            networkMarkers[network._id] =
                L.circleMarker([network.Latitude, network.Longitude], {
                    radius: defaultMarkerSize,
                    color: networkColor,
                    fillColor: networkColor,
                    fillOpacity: 0.8
                }).bindTooltip(`SSID: ${network.Ssid}<br>
                    BSSID: ${network.Bssid}<br>
                    Frequency: ${network.Frequency} MHz<br>
                    Capabilities: ${network.Capabilities}`);
        }
    })
}

function addMarker(networkId) {
    if (!overlayLayer.hasLayer(networkMarkers[networkId])) {
        overlayLayer.addLayer(networkMarkers[networkId]);
    }
}

function removeMarker(networkId) {
    if (overlayLayer.hasLayer(networkMarkers[networkId])) {
        overlayLayer.removeLayer(networkMarkers[networkId]);
    }
}

map.on('moveend', async () => {
    await update();
});

window.onload = async () => {
    await update();
};

async function update() {
    const networks = await fetchNetworksInBounds();
    updateTable(networks);
    updateMarkers(networks);
}

document.getElementById("checkbox-all").onchange = (e) => {
    const tableBody = document.getElementById('network-table');
    const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');

    Array.from(checkboxes).forEach(checkbox => {
        checkbox.checked = e.target.checked;
        checkbox.onChangeHandler(checkbox.checked);
    });
};