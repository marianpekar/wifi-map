﻿const map = L.map('map').setView([49.204, 16.605], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const overlayLayer = L.layerGroup().addTo(map);
const networkMarkers = {};
const selectedNetworks = new Set();

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
        const networkId = network._id;

        if (!networkMarkers[networkId]) {
            const networkColor = getColorFromBSSID(network.Bssid);
            networkMarkers[networkId] = network.Levels.map(level =>
                L.circleMarker([level.Latitude, level.Longitude], {
                    radius: 5,
                    color: networkColor,
                    fillColor: networkColor,
                    fillOpacity: 0.8
                }).bindTooltip(`${network.Ssid} ${level.Power}`)
            );
        }

        const row = document.createElement('tr');
        row.innerHTML = `
             <td class="text-center"><input type="checkbox" data-network-id="${networkId}" ${selectedNetworks.has(networkId) ? 'checked' : ''}></td>
            <td>${network.Ssid}</td>
            <td>${network.Bssid}</td>
            <td>${network.Frequency} MHz</td>
            <td>${network.Capabilities}</td>
        `;
        tableBody.appendChild(row);

        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.onChangeHandler = (checked) => {
            if (checked) {
                selectedNetworks.add(networkId);
                addMarkers(networkId);
            } else {
                selectedNetworks.delete(networkId);
                removeMarkers(networkId);
            }
        }
        checkbox.onchange = (e) => checkbox.onChangeHandler(e.target.checked);
    });
}

function addMarkers(networkId) {
    networkMarkers[networkId].forEach(marker => {
        if (!overlayLayer.hasLayer(marker)) {
            overlayLayer.addLayer(marker);
        }
    });
}

function removeMarkers(networkId) {
    networkMarkers[networkId].forEach(marker => {
        if (overlayLayer.hasLayer(marker)) {
            overlayLayer.removeLayer(marker);
        }
    });
}

map.on('moveend', async () => {
    const networks = await fetchNetworksInBounds();
    updateTable(networks);
});

window.onload = async () => {
    const networks = await fetchNetworksInBounds();
    updateTable(networks);
};

document.getElementById("checkbox-all").onchange = (e) => {
    const tableBody = document.getElementById('network-table');
    const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');

    Array.from(checkboxes).forEach(checkbox => {         
        checkbox.checked = e.target.checked;
        checkbox.onChangeHandler(checkbox.checked);
    });
};