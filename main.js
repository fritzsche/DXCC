import { CallsignLookup } from './CallsignLookup.js'



/**
 * Class: MapManager
 * Description: Wraps Leaflet functionality to keep the App class clean.
 */
class MapManager {
    constructor(elementId) {
        this.mapElementId = elementId
        this.map = null
        this.currentMarker = null
    }

    init() {
        // Initialize map centered on Atlantic Ocean
        this.map = L.map(this.mapElementId).setView([20, 0], 2)

        // Add OpenStreetMap Tile Layer (Open Source)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map)
    }

    /**
     * Updates the map view and adds a marker.
     * @param {number} lat 
     * @param {number} lon 
     * @param {string} popupContent 
     */
    showLocation(lat, lon, popupContent) {
        if (!this.map) return

        // Remove existing marker
        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker)
        }

        // Fly to the location (smooth animation)
        this.map.flyTo([lat, lon], 5, {
            animate: true,
            duration: 1.5
        })

        // Add new Marker
        this.currentMarker = L.marker([lat, lon]).addTo(this.map)
            .bindPopup(popupContent)
            .openPopup()
    }
}

/**
 * Class: App
 * Description: Controls UI events and bridges Lookup and MapManager.
 */
class App {
    constructor() {
        this.lookup = new CallsignLookup()
        this.mapManager = new MapManager('map')

        // UI References
        this.inputEl = document.getElementById('callsignInput')
        this.btnEl = document.getElementById('searchBtn')
        this.resultArea = document.getElementById('resultArea')
    }

    init() {
        // Setup Map
        this.mapManager.init()

        // Setup Event Listeners
        this.btnEl.addEventListener('click', () => this.handleSearch())
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch()
        })
    }

    handleSearch() {
        const rawCall = this.inputEl.value.trim()

        if (!rawCall) return

        const result = this.lookup.find(rawCall)
        result.long *= -1
        if (result) {
            this.displayResult(result)
            this.mapManager.showLocation(
                result.lat,
                result.long,
                `<b>${rawCall}</b><br>${result.entity}<br>CQ: ${result.cq} / ITU: ${result.itu}`
            )
        } else {
            this.displayError()
        }
    }

    displayResult(data) {
        this.resultArea.style.display = 'block'

        document.getElementById('resFlag').textContent = data.flag
        document.getElementById('resEntity').textContent = data.entity
        document.getElementById('resPrefix').textContent = data.prefix
        document.getElementById('resCountry').textContent = `${data.country} (ID: ${data.entity_id})`
        document.getElementById('resCQ').textContent = data.cq
        document.getElementById('resITU').textContent = data.itu
        document.getElementById('resCont').textContent = data.cont
        document.getElementById('resUTC').textContent = data.utc >= 0 ? `UTC+${data.utc}` : `UTC${data.utc}`
        document.getElementById('resLat').textContent = data.lat.toFixed(4)
        document.getElementById('resLon').textContent = data.long.toFixed(4)
    }

    displayError() {
        this.resultArea.style.display = 'block'
        document.getElementById('resFlag').textContent = '❌'
        document.getElementById('resEntity').textContent = 'Not Found'

        // Clear fields
        const fields = ['resPrefix', 'resCountry', 'resCQ', 'resITU', 'resCont', 'resUTC', 'resLat', 'resLon']
        fields.forEach(id => document.getElementById(id).textContent = '--')
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
})
