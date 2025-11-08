// DOM Elements
const wrapper = document.querySelector(".wrapper");
const inputPart = document.querySelector(".input-part");
const infoTxt = inputPart ? inputPart.querySelector(".info-txt") : null;
const inputField = inputPart ? inputPart.querySelector("input") : null;
const locationBtn = inputPart ? inputPart.querySelector("button") : null;
const weatherPart = wrapper ? wrapper.querySelector(".weather-part") : null;
const wIcon = weatherPart ? weatherPart.querySelector("img") : null;
const arrowBack = wrapper ? wrapper.querySelector("header i") : null;
const themeToggle = document.querySelector(".theme-toggle");
const unitToggle = document.querySelector(".unit-toggle");
const loadingElement = document.querySelector(".loading");
const dateText = weatherPart ? weatherPart.querySelector(".date-text") : null;
const timeText = weatherPart ? weatherPart.querySelector(".time-text") : null;
const historyList = inputPart ? inputPart.querySelector(".history-list") : null;
const tempChartCanvas = document.getElementById('temperatureChart');
const forecastContainer = document.querySelector('.forecast-container');

let api;
let isCelsius = true;
let timeInterval = null;
let searchHistory = [];
let chartInstance = null;

// Load search history from localStorage
function loadSearchHistory() {
  const storedHistory = localStorage.getItem('weatherSearchHistory');
  if (storedHistory) {
    searchHistory = JSON.parse(storedHistory);
    displaySearchHistory();
  }
}

// Save search history to localStorage
function saveSearchHistory() {
  localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
}

// Add city to search history
function addToSearchHistory(city) {
  // Remove if already exists
  searchHistory = searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase());
  
  // Add to the beginning
  searchHistory.unshift(city);
  
  // Keep only the last 10 items
  if (searchHistory.length > 10) {
    searchHistory = searchHistory.slice(0, 10);
  }
  
  // Save and display
  saveSearchHistory();
  displaySearchHistory();
}

// Display search history
function displaySearchHistory() {
  if (!historyList) return;
  
  historyList.innerHTML = '';
  
  searchHistory.forEach(city => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      ${city}
      <i class='bx bx-x'></i>
    `;
    
    // Click to search
    historyItem.addEventListener('click', (e) => {
      if (e.target.classList.contains('bx-x')) {
        // Remove item
        searchHistory = searchHistory.filter(item => item !== city);
        saveSearchHistory();
        displaySearchHistory();
      } else {
        // Search for city
        if (inputField) inputField.value = city;
        requestApi(city);
      }
    });
    
    historyList.appendChild(historyItem);
  });
}

// Event Listeners
if (inputField) {
  inputField.addEventListener("keyup", e => {
    if (e.key == "Enter" && inputField.value != "") {
      const city = inputField.value.trim();
      addToSearchHistory(city);
      requestApi(city);
    }
  });
}

if (locationBtn) {
  locationBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
      showLoading();
      navigator.geolocation.getCurrentPosition(onSuccess, onError);
    } else {
      showError("Your browser does not support geolocation API");
    }
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = themeToggle.querySelector("i");
    if (icon) {
      if (document.body.classList.contains("dark-mode")) {
        icon.classList.remove("bxs-sun");
        icon.classList.add("bxs-moon");
      } else {
        icon.classList.remove("bxs-moon");
        icon.classList.add("bxs-sun");
      }
    }
  });
}

if (unitToggle) {
  unitToggle.addEventListener("click", () => {
    isCelsius = !isCelsius;
    unitToggle.textContent = isCelsius ? "°F" : "°C";
    // We would need to re-fetch or convert the current data
  });
}

if (arrowBack) {
  arrowBack.addEventListener("click", () => {
    wrapper.classList.remove("active");
    if (infoTxt) {
      infoTxt.classList.remove("error");
      infoTxt.innerText = "";
    }
    // Clear the time interval when going back
    if (timeInterval) {
      clearInterval(timeInterval);
      timeInterval = null;
    }
  });
}

// API Functions
function requestApi(city) {
  showLoading();
  // Main weather API
  const weatherApi = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=c1240d9f4bd5212d7bfed066ad2dfc14`;
  // Air quality API (requires separate call)
  const aqiApi = `https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid=c1240d9f4bd5212d7bfed066ad2dfc14`;
  
  // For now, we'll just fetch the main weather data
  api = weatherApi;
  fetchData();
}

function onSuccess(position) {
  const { latitude, longitude } = position.coords;
  api = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=c1240d9f4bd5212d7bfed066ad2dfc14`;
  fetchData();
}

function onError(error) {
  showError(error.message);
}

// UI Functions
function showLoading() {
  if (loadingElement) {
    loadingElement.classList.add("show");
  }
  if (weatherPart) {
    weatherPart.style.opacity = "0";
    weatherPart.style.transform = "translateY(20px)";
  }
}

function hideLoading() {
  if (loadingElement) {
    loadingElement.classList.remove("show");
  }
  if (weatherPart) {
    weatherPart.style.opacity = "1";
    weatherPart.style.transform = "translateY(0)";
  }
}

function showError(message) {
  hideLoading();
  if (infoTxt) {
    infoTxt.innerText = message;
    infoTxt.classList.add("error");
    setTimeout(() => {
      infoTxt.classList.remove("error");
      infoTxt.innerText = "";
    }, 3000);
  }
}

// Date and Time Functions
function updateDateTime() {
  const now = new Date();
  
  // Update date
  if (dateText) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateText.innerText = now.toLocaleDateString('en-US', options);
  }
  
  // Update time
  if (timeText) {
    timeText.innerText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

function startTimeUpdater() {
  // Clear any existing interval
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  
  // Update time immediately
  updateDateTime();
  
  // Update time every minute
  timeInterval = setInterval(updateDateTime, 60000);
}

// Chart Functions
function createTemperatureChart(temperatures, labels) {
  if (!tempChartCanvas) return;
  
  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  // Create new chart
  const ctx = tempChartCanvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Temperature (°C)',
        data: temperatures,
        borderColor: '#43AFFC',
        backgroundColor: 'rgba(67, 175, 252, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#43AFFC',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#1e222d'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#1e222d'
          }
        }
      }
    }
  });
}

// Generate mock temperature data for the next 24 hours
function generateTemperatureData(currentTemp) {
  const temperatures = [];
  const labels = [];
  const now = new Date();
  
  // Generate 8 data points for the next 24 hours (every 3 hours)
  for (let i = 0; i < 8; i++) {
    const hoursAhead = i * 3;
    const time = new Date(now);
    time.setHours(now.getHours() + hoursAhead);
    
    // Format time label
    const hour = time.getHours();
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    labels.push(`${displayHour}${period}`);
    
    // Generate temperature with slight variation
    const variation = Math.sin(i * Math.PI / 4) * 3; // Sinusoidal variation
    const temp = currentTemp + variation + (Math.random() * 2 - 1); // Add some randomness
    temperatures.push(Math.round(temp));
  }
  
  return { temperatures, labels };
}

// 5-Day Forecast Functions
function displayFiveDayForecast(currentTemp, weatherId) {
  if (!forecastContainer) return;
  
  // Clear existing forecast
  forecastContainer.innerHTML = '';
  
  // Get current day
  const today = new Date();
  
  // Create 5 day forecast items
  for (let i = 1; i <= 5; i++) {
    const forecastDate = new Date();
    forecastDate.setDate(today.getDate() + i);
    
    // Get day name (e.g., "Mon", "Tue")
    const dayName = forecastDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Generate mock min/max temperatures
    const baseTemp = currentTemp + (Math.random() * 4 - 2); // Small variation from current temp
    const maxTemp = Math.round(baseTemp + (Math.random() * 3 + 1)); // 1-4 degrees higher
    const minTemp = Math.round(baseTemp - (Math.random() * 3 + 1)); // 1-4 degrees lower
    
    // Determine weather condition for this day (simplified)
    let forecastWeatherId = weatherId;
    // Occasionally change the weather condition
    if (Math.random() > 0.7) {
      const conditions = [800, 801, 802, 803, 804, 500, 501, 300, 200];
      forecastWeatherId = conditions[Math.floor(Math.random() * conditions.length)];
    }
    
    // Determine if it's day or night (using noon for forecast)
    const isDay = true;
    const timeSuffix = isDay ? 'd' : 'n';
    
    // Create forecast item
    const forecastItem = document.createElement('div');
    forecastItem.className = 'forecast-item';
    forecastItem.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <img class="forecast-icon" src="https://openweathermap.org/img/wn/${getWeatherIconCode(forecastWeatherId, timeSuffix)}@2x.png" alt="weather icon">
      <div class="forecast-temp">
        <span class="forecast-temp-max">${maxTemp}°</span>
        <span class="forecast-temp-min">${minTemp}°</span>
      </div>
    `;
    
    forecastContainer.appendChild(forecastItem);
  }
}

function getWeatherIconCode(weatherId, timeSuffix) {
  // Set weather icon based on weather condition
  if (weatherId >= 200 && weatherId <= 232) {
    // Thunderstorm
    return `11${timeSuffix}`;
  } else if (weatherId >= 300 && weatherId <= 321) {
    // Drizzle
    return `09${timeSuffix}`;
  } else if (weatherId >= 500 && weatherId <= 531) {
    // Rain
    if (weatherId >= 500 && weatherId <= 504) {
      // Light rain
      return `10${timeSuffix}`;
    } else {
      // Heavy rain
      return `09${timeSuffix}`;
    }
  } else if (weatherId >= 600 && weatherId <= 622) {
    // Snow
    return `13${timeSuffix}`;
  } else if (weatherId >= 701 && weatherId <= 781) {
    // Atmosphere (mist, fog, etc.)
    return `50${timeSuffix}`;
  } else if (weatherId === 800) {
    // Clear sky
    return `01${timeSuffix}`;
  } else if (weatherId >= 801 && weatherId <= 804) {
    // Clouds
    if (weatherId === 801) {
      // Few clouds
      return `02${timeSuffix}`;
    } else if (weatherId === 802) {
      // Scattered clouds
      return `03${timeSuffix}`;
    } else if (weatherId === 803 || weatherId === 804) {
      // Broken/overcast clouds
      return `04${timeSuffix}`;
    } else {
      // Default clouds
      return `02${timeSuffix}`;
    }
  } else {
    // Default fallback
    return `01${timeSuffix}`;
  }
}

// Data Functions
async function fetchData() {
  try {
    if (infoTxt) {
      infoTxt.innerText = "Getting weather details...";
      infoTxt.classList.add("pending");
    }
    
    const response = await fetch(api);
    const result = await response.json();
    
    if (response.ok) {
      weatherDetails(result);
    } else {
      throw new Error(result.message || "City not found");
    }
  } catch (error) {
    showError(error.message || "Failed to fetch weather data");
  } finally {
    if (infoTxt) {
      infoTxt.classList.remove("pending");
    }
  }
}

function weatherDetails(info) {
  hideLoading();
  updateWeatherUI(info);
  wrapper.classList.add("active");
  
  // Start the time updater
  startTimeUpdater();
}

function updateWeatherUI(info) {
  if (!weatherPart) return;
  
  const city = info.name;
  const country = info.sys.country;
  const { description, id } = info.weather[0];
  const temp = info.main.temp;
  const feels_like = info.main.feels_like;
  const humidity = info.main.humidity;
  const windSpeed = info.wind.speed;
  const pressure = info.main.pressure;
  const sunrise = new Date(info.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(info.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Additional metrics (calculated or from API where available)
  const visibility = info.visibility ? (info.visibility / 1000).toFixed(1) : 'N/A'; // Convert to km
  const uvIndex = Math.floor(Math.random() * 11); // Simulated UV index (0-10)
  const cloudCover = info.clouds ? info.clouds.all : 'N/A'; // Cloud cover percentage
  const dewPoint = calculateDewPoint(temp, humidity); // Calculate dew point
  const aqi = Math.floor(Math.random() * 5) + 1; // Simulated AQI (1-5)
  
  // Update date and time
  updateDateTime();
  
  // Set weather icon based on weather condition and time of day
  setWeatherIcon(id, info.dt, info.sys.sunrise, info.sys.sunset);
  
  // Change background based on weather condition
  changeBackgroundBasedOnWeather(id, info.dt, info.sys.sunrise, info.sys.sunset);
  
  // Generate and display temperature chart
  const { temperatures, labels } = generateTemperatureData(temp);
  createTemperatureChart(temperatures, labels);
  
  // Display 5-day forecast
  displayFiveDayForecast(temp, id);
  
  // Update UI elements
  const numbElement = weatherPart.querySelector(".temp .numb");
  if (numbElement) numbElement.innerText = Math.floor(temp);
  
  const unitElement = weatherPart.querySelector(".temp .unit");
  if (unitElement) unitElement.innerText = "C";
  
  const weatherElement = weatherPart.querySelector(".weather");
  if (weatherElement) weatherElement.innerText = description;
  
  const locationElement = weatherPart.querySelector(".location span");
  if (locationElement) locationElement.innerText = `${city}, ${country}`;
  
  const numb2Element = weatherPart.querySelector(".temp .numb-2");
  if (numb2Element) numb2Element.innerText = Math.floor(feels_like);
  
  const feelsLikeUnitElement = weatherPart.querySelector(".feels .temp .unit");
  if (feelsLikeUnitElement) feelsLikeUnitElement.innerText = "C";
  
  const humidityElement = weatherPart.querySelector(".humidity span");
  if (humidityElement) humidityElement.innerText = `${humidity}%`;
  
  const windElement = weatherPart.querySelector(".wind span");
  if (windElement) windElement.innerText = `${windSpeed} m/s`;
  
  const pressureElement = weatherPart.querySelector(".pressure span");
  if (pressureElement) pressureElement.innerText = `${pressure} hPa`;
  
  const sunriseElement = weatherPart.querySelector(".sunrise .details span");
  if (sunriseElement) sunriseElement.innerText = sunrise;
  
  const sunsetElement = weatherPart.querySelector(".sunset .details span");
  if (sunsetElement) sunsetElement.innerText = sunset;
  
  // Update additional metrics
  const visibilityElement = weatherPart.querySelector(".visibility .visibility-value");
  if (visibilityElement) visibilityElement.innerText = `${visibility} km`;
  
  const uvElement = weatherPart.querySelector(".uv-index .uv-value");
  if (uvElement) {
    uvElement.innerText = uvIndex;
    // Add UV index color coding
    uvElement.className = 'uv-value';
    if (uvIndex <= 2) {
      uvElement.classList.add('low');
    } else if (uvIndex <= 5) {
      uvElement.classList.add('moderate');
    } else if (uvIndex <= 7) {
      uvElement.classList.add('high');
    } else if (uvIndex <= 10) {
      uvElement.classList.add('very-high');
    } else {
      uvElement.classList.add('extreme');
    }
  }
  
  const cloudElement = weatherPart.querySelector(".cloud-cover .cloud-value");
  if (cloudElement) {
    if (cloudCover !== 'N/A') {
      cloudElement.innerText = `${getCloudDescription(cloudCover)} – ${cloudCover}%`;
    } else {
      cloudElement.innerText = 'N/A';
    }
  }
  
  const dewElement = weatherPart.querySelector(".dew-point .dew-value");
  if (dewElement) dewElement.innerText = `${Math.round(dewPoint)}°C`;
  
  const aqiElement = weatherPart.querySelector(".aqi .aqi-value");
  if (aqiElement) {
    aqiElement.innerText = aqi;
    // Add AQI color coding
    aqiElement.className = 'aqi-value';
    if (aqi === 1) {
      aqiElement.classList.add('good');
    } else if (aqi === 2) {
      aqiElement.classList.add('fair');
    } else if (aqi === 3) {
      aqiElement.classList.add('moderate');
    } else if (aqi === 4) {
      aqiElement.classList.add('poor');
    } else {
      aqiElement.classList.add('very-poor');
    }
  }
}

function calculateDewPoint(temperature, humidity) {
  // Simplified dew point calculation
  // More accurate formulas exist but this is sufficient for display purposes
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return dewPoint;
}

function getCloudDescription(cloudCover) {
  const cover = parseInt(cloudCover);
  if (cover <= 10) return "Clear";
  if (cover <= 30) return "Mostly Clear";
  if (cover <= 60) return "Partly Cloudy";
  if (cover <= 90) return "Mostly Cloudy";
  return "Overcast";
}

function isDayTime(currentTime, sunrise, sunset) {
  return currentTime > sunrise && currentTime < sunset;
}

function setWeatherIcon(id, currentTime, sunrise, sunset) {
  if (!wIcon) return;
  
  // Determine if it's day or night
  const isDay = isDayTime(currentTime, sunrise, sunset);
  const timeSuffix = isDay ? 'd' : 'n'; // 'd' for day, 'n' for night
  
  // Set weather icon based on weather condition and time of day
  if (id >= 200 && id <= 232) {
    // Thunderstorm
    wIcon.src = `https://openweathermap.org/img/wn/11${timeSuffix}@4x.png`;
  } else if (id >= 300 && id <= 321) {
    // Drizzle
    wIcon.src = `https://openweathermap.org/img/wn/09${timeSuffix}@4x.png`;
  } else if (id >= 500 && id <= 531) {
    // Rain
    if (id >= 500 && id <= 504) {
      // Light rain
      wIcon.src = `https://openweathermap.org/img/wn/10${timeSuffix}@4x.png`;
    } else {
      // Heavy rain
      wIcon.src = `https://openweathermap.org/img/wn/09${timeSuffix}@4x.png`;
    }
  } else if (id >= 600 && id <= 622) {
    // Snow
    wIcon.src = `https://openweathermap.org/img/wn/13${timeSuffix}@4x.png`;
  } else if (id >= 701 && id <= 781) {
    // Atmosphere (mist, fog, etc.)
    wIcon.src = `https://openweathermap.org/img/wn/50${timeSuffix}@4x.png`;
  } else if (id === 800) {
    // Clear sky
    wIcon.src = `https://openweathermap.org/img/wn/01${timeSuffix}@4x.png`;
  } else if (id >= 801 && id <= 804) {
    // Clouds
    if (id === 801) {
      // Few clouds
      wIcon.src = `https://openweathermap.org/img/wn/02${timeSuffix}@4x.png`;
    } else if (id === 802) {
      // Scattered clouds
      wIcon.src = `https://openweathermap.org/img/wn/03${timeSuffix}@4x.png`;
    } else if (id === 803 || id === 804) {
      // Broken/overcast clouds
      wIcon.src = `https://openweathermap.org/img/wn/04${timeSuffix}@4x.png`;
    } else {
      // Default clouds
      wIcon.src = `https://openweathermap.org/img/wn/02${timeSuffix}@4x.png`;
    }
  } else {
    // Default fallback
    wIcon.src = `https://openweathermap.org/img/wn/01${timeSuffix}@4x.png`;
  }
}

function changeBackgroundBasedOnWeather(id, currentTime, sunrise, sunset) {
  const body = document.body;
  if (!body) return;
  
  // Remove all weather classes
  body.classList.remove("clear", "clouds", "rain", "thunderstorm", "snow", "mist");
  
  // Determine if it's day or night
  const isDay = isDayTime(currentTime, sunrise, sunset);
  
  // Add appropriate class based on weather and time of day
  if (id === 800) {
    // Clear sky
    body.classList.add("clear");
    if (isDay) {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1600861194822-0748f70e9e40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    } else {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1498561752704-3bcc6ca603fc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    }
  } else if (id >= 801 && id <= 804) {
    // Clouds
    body.classList.add("clouds");
    if (isDay) {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1504607757704-8c8681e0e6d1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    } else {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1504608529424-2c190c52c5d3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    }
  } else if ((id >= 300 && id <= 321) || (id >= 500 && id <= 531)) {
    // Rain
    body.classList.add("rain");
    if (isDay) {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1519692933721-226b3d6f4b3a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    } else {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1518791841217-8f162f1e1131?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    }
  } else if (id >= 200 && id <= 232) {
    // Thunderstorm
    body.classList.add("thunderstorm");
    if (isDay) {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1600861194822-0748f70e9e40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    } else {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1504607757704-8c8681e0e6d1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    }
  } else if (id >= 600 && id <= 622) {
    // Snow
    body.classList.add("snow");
    if (isDay) {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1519692933721-226b3d6f4b3a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    } else {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1518791841217-8f162f1e1131?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    }
  } else if (id >= 701 && id <= 781) {
    // Mist/fog
    body.classList.add("mist");
    if (isDay) {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1504608529424-2c190c52c5d3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    } else {
      body.style.backgroundImage = "url('https://images.unsplash.com/photo-1498561752704-3bcc6ca603fc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
    }
  } else {
    // Default background
    body.classList.add("clear");
    body.style.backgroundImage = "url('https://images.unsplash.com/photo-1600861194822-0748f70e9e40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')";
  }
}

// Initialize the app
loadSearchHistory();