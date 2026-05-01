// Google Apps Script Endpoint
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYX2CKpZ9BHaWXMtpfw6fTVINr4L1oTG7x4m9Uk9YqEG2Zy0HyhVfgcNPS5-r3CT5keg/exec';

// DOM Elements
const dateTimeEl = document.getElementById('dateTime');
const currentTempEl = document.getElementById('current-temp');
const highTempEl = document.getElementById('high-temp');
const lowTempEl = document.getElementById('low-temp');
const humidityEl = document.getElementById('humidity');
const pressureEl = document.getElementById('pressure');
const uvIndexEl = document.getElementById('uv-index');
const aqiEl = document.getElementById('aqi');
const coLevelEl = document.getElementById('co-level');
const pm25El = document.getElementById('pm25');
const pm10El = document.getElementById('pm10');
const windSpeedEl = document.getElementById('wind-speed');
const windDirectionEl = document.getElementById('wind-direction');
const windAngleEl = document.getElementById('wind-angle');
const windGustEl = document.getElementById('wind-gust');
const compassWindSpeedEl = document.getElementById('compass-wind-speed');
const needleEl = document.getElementById('needle');
const thermometerFill = document.getElementById('thermometer-mercury');

let temperatureChart, hourlyChart;

// date time updater
function displayDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    dateTimeEl.textContent = now.toLocaleDateString('en-IN', options);
}

// AQI calculation
function calculateAQI(pm25, pm10) {
    const pm25Breakpoints = [0, 30, 60, 90, 120, 250, 500];
    const pm25AQI = [0, 50, 100, 200, 300, 400, 500];
    const pm10Breakpoints = [0, 50, 100, 250, 350, 430, 500];
    const pm10AQI = [0, 50, 100, 200, 300, 400, 500];
    const subIndex = (val, breaks, aqis) => {
        if (val <= breaks[0]) return 0;
        for (let i = 1; i < breaks.length; i++) {
            if (val <= breaks[i]) return Math.round(((aqis[i] - aqis[i-1]) / (breaks[i] - breaks[i-1])) * (val - breaks[i-1]) + aqis[i-1]);
        }
        return aqis[aqis.length-1];
    };
    return Math.max(subIndex(pm25, pm25Breakpoints, pm25AQI), subIndex(pm10, pm10Breakpoints, pm10AQI));
}

// Update thermometer
function updateThermometer(temp) {
    let height = Math.min(100, Math.max(0, (temp / 50) * 100));
    thermometerFill.style.height = `${height}%`;
    let color = temp < 15 ? '#42a5f5' : (temp < 28 ? '#4caf50' : (temp < 35 ? '#ff9800' : '#f44336'));
    thermometerFill.style.background = `linear-gradient(0deg, ${color}, #ffcd7e)`;
}

// Update AQI color
function updateAQIColor(aqi) {
    let color = '#4caf50';
    if (aqi > 50 && aqi <= 100) color = '#ffeb3b';
    else if (aqi > 100 && aqi <= 200) color = '#ff9800';
    else if (aqi > 200 && aqi <= 300) color = '#f44336';
    else if (aqi > 300) color = '#9c27b0';
    aqiEl.style.color = color;
}

// Fetch and update weather data
async function fetchWeatherData() {
    try {
        const response = await fetch(APP_SCRIPT_URL);
        const result = await response.json();
        if (result.status === 'success' && result.data.length > 0) {
            const d = result.data[0];
            const weather = {
                temperature: parseFloat(d[0]) || 24.5,
                humidity: parseFloat(d[1]) || 58,
                highTemp: parseFloat(d[2]) || 32,
                lowTemp: parseFloat(d[3]) || 20,
                pressure: parseFloat(d[4]) || 1012,
                uvIndex: parseFloat(d[5]) || 6,
                pm25: parseFloat(d[6]) || 38,
                pm10: parseFloat(d[7]) || 70,
                coLevel: parseFloat(d[8]) || 0.8,
                windSpeed: parseFloat(d[9]) || 12,
                windDirection: d[10] || 'NE',
                rainfall: parseFloat(d[11]) || 0
            };
            weather.aqi = calculateAQI(weather.pm25, weather.pm10);
            updateWeatherDisplay(weather);
            const chartData = result.data.slice(0, 24).map(row => parseFloat(row[0]) || 22);
            updateTemperatureChart(chartData);
        } else throw new Error('using fallback');
    } catch (error) {
        console.warn('Using simulated data');
        updateWeatherDisplay(getFallbackData());
    }
}

function getFallbackData() {
    return {
        temperature: 28.4, humidity: 62, highTemp: 33.2, lowTemp: 21.5,
        pressure: 1013, uvIndex: 7.2, pm25: 42, pm10: 85, coLevel: 0.9,
        windSpeed: 14, windDirection: 'SE', aqi: 95
    };
}

function updateWeatherDisplay(data) {
    currentTempEl.textContent = `${data.temperature.toFixed(1)}°C`;
    highTempEl.textContent = `${data.highTemp.toFixed(1)}°C`;
    lowTempEl.textContent = `${data.lowTemp.toFixed(1)}°C`;
    humidityEl.textContent = `${data.humidity.toFixed(0)}%`;
    pressureEl.textContent = `${data.pressure.toFixed(0)} hPa`;
    uvIndexEl.textContent = data.uvIndex.toFixed(1);
    aqiEl.textContent = data.aqi;
    coLevelEl.textContent = `${data.coLevel.toFixed(1)} ppm`;
    pm25El.textContent = `${data.pm25.toFixed(1)} µg/m³`;
    pm10El.textContent = `${data.pm10.toFixed(1)} µg/m³`;
    let windSpeedKmh = (data.windSpeed * 1).toFixed(1);
    windSpeedEl.textContent = `${windSpeedKmh} km/h`;
    compassWindSpeedEl.textContent = windSpeedKmh;
    updateThermometer(data.temperature);
    updateAQIColor(data.aqi);
    // wind direction needle
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    let deg = 0;
    if (isNaN(data.windDirection)) {
        let idx = directions.indexOf(data.windDirection.toUpperCase());
        deg = idx * 22.5;
    } else deg = parseFloat(data.windDirection);
    let finalDir = directions[Math.round(deg / 22.5) % 16];
    windDirectionEl.textContent = `${finalDir} ${Math.round(deg)}°`;
    windAngleEl.textContent = `${Math.round(deg)}°`;
    if (needleEl) needleEl.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
}

// Temperature chart (background trend)
function initTemperatureChart() {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    temperatureChart = new Chart(ctx, {
        type: 'line', data: { labels: Array(24).fill().map((_,i)=>`${i}h`), datasets: [{ label: '°C', data: Array(24).fill(25), borderColor: '#ffcc00', borderWidth: 2, fill: true, backgroundColor: 'rgba(255,204,0,0.05)', pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.1)' } } } }
    });
}
function updateTemperatureChart(temps) {
    if (temperatureChart) { temperatureChart.data.datasets[0].data = temps; temperatureChart.update(); }
}

// Sun times
async function fetchSunTimes() {
    try {
        const res = await fetch('https://api.sunrise-sunset.org/json?lat=23.6889&lng=86.9661&formatted=0');
        const data = await res.json();
        if (data.status === "OK") {
            let sunrise = new Date(data.results.sunrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            let sunset = new Date(data.results.sunset).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('sunrise-time').textContent = sunrise;
            document.getElementById('sunset-time').textContent = sunset;
            updateSunPosition(new Date(data.results.sunrise), new Date(data.results.sunset));
        }
    } catch(e) { console.log(e); }
}
function updateSunPosition(sunrise, sunset) {
    const now = new Date();
    const sunEl = document.getElementById('sun');
    if (now < sunrise || now > sunset) { sunEl.style.opacity = '0.3'; return; }
    sunEl.style.opacity = '1';
    let total = sunset - sunrise, elapsed = now - sunrise;
    let progress = Math.min(1, Math.max(0, elapsed / total));
    let leftPos = 10 + progress * 80;
    sunEl.style.left = `calc(${leftPos}% - 12px)`;
}

// Moon Phase
function updateMoonPhase() {
    const date = new Date();
    const lunarCycle = 29.53058867 * 86400000;
    const newMoonRef = new Date('2025-01-29').getTime();
    const diff = date.getTime() - newMoonRef;
    const phase = (diff % lunarCycle) / lunarCycle;
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    const phases = [
        { icon: '🌑', name: 'New Moon', min: 0, max: 0.03 }, { icon: '🌒', name: 'Waxing Crescent', min: 0.03, max: 0.2 },
        { icon: '🌓', name: 'First Quarter', min: 0.2, max: 0.28 }, { icon: '🌔', name: 'Waxing Gibbous', min: 0.28, max: 0.45 },
        { icon: '🌕', name: 'Full Moon', min: 0.45, max: 0.55 }, { icon: '🌖', name: 'Waning Gibbous', min: 0.55, max: 0.72 },
        { icon: '🌗', name: 'Last Quarter', min: 0.72, max: 0.78 }, { icon: '🌘', name: 'Waning Crescent', min: 0.78, max: 0.97 }
    ];
    let current = phases.find(p => phase >= p.min && phase < p.max) || phases[0];
    document.getElementById('moon-phase-icon').textContent = current.icon;
    document.getElementById('moon-phase-details').textContent = current.name;
    document.getElementById('moon-illumination').textContent = `${(illumination*100).toFixed(1)}%`;
}

// Weekly forecast data generator with icons
function loadWeeklyForecast() {
    const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const tempsHigh = [38, 33, 33, 34, 33, 34, 33];
    const tempsLow = [23, 22, 23, 23, 23, 23, 23];
    const icons = ['⛅', '⛈️', '🌦️', '☀️', '☀️', '☀️', '⛈️'];
    const container = document.getElementById('weeklyForecastGrid');
    if (container) {
        container.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            container.innerHTML += `<div class="forecast-day"><div class="day-name">${weekdays[i]}</div><div class="icon">${icons[i]}</div><strong>${tempsHigh[i]}°</strong> <span style="opacity:0.7;">${tempsLow[i]}°</span><div class="rain-chance">${i===1?'90%':i===6?'35%':'20%'}</div></div>`;
        }
    }
}

// Hourly temperature interactive chart & list
function generateHourlyTemps() {
    let temps = [];
    for (let h = 0; h < 24; h++) {
        let val = 19.5 + 7.5 * Math.cos(Math.PI * (h - 15) / 12) + (Math.random() * 0.6 - 0.3);
        temps.push(parseFloat(val.toFixed(1)));
    }
    return temps;
}
let currentHourlyTemps = generateHourlyTemps();
function initHourlyChart() {
    const ctx = document.getElementById('hourlyTempChartMain').getContext('2d');
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array.from({length:24}, (_,i)=> i+':00'), datasets: [{ label: 'Temperature °C', data: currentHourlyTemps, borderColor: '#f97316', tension: 0.2, fill: true, backgroundColor: 'rgba(249,115,22,0.1)' }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw}°C` } } } }
    });
}
function refreshHourly() {
    currentHourlyTemps = generateHourlyTemps();
    if (hourlyChart) { hourlyChart.data.datasets[0].data = currentHourlyTemps; hourlyChart.update(); }
    updateHourlyList();
}
function updateHourlyList() {
    const container = document.getElementById('hourlyScrollList');
    if (!container) return;
    container.innerHTML = '';
    currentHourlyTemps.forEach((temp, idx) => {
        let hourLabel = idx + ':00';
        container.innerHTML += `<div class="hour-item"><strong>${hourLabel}</strong><div style="font-size:1.2rem;">${temp}°</div><span>🌡️</span></div>`;
    });
}

// main init
window.onload = () => {
    displayDateTime(); setInterval(displayDateTime, 1000);
    initTemperatureChart();
    initHourlyChart();
    updateHourlyList();
    loadWeeklyForecast();
    fetchSunTimes();
    updateMoonPhase(); setInterval(updateMoonPhase, 3600000);
    fetchWeatherData(); setInterval(fetchWeatherData, 300000);
    document.getElementById('refreshHourlyBtn')?.addEventListener('click', refreshHourly);
};