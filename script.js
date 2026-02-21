document.addEventListener("DOMContentLoaded", () => {

  const cityInput = document.getElementById("cityInput");
  const getWeatherBtn = document.getElementById("getWeatherBtn");
  const note = document.getElementById("note");

  const currentWeather = document.getElementById("currentWeather");
  const cityNameEl = document.getElementById("cityName");
  const descEl = document.getElementById("weatherDesc");
  const tempEl = document.getElementById("temperature");
  const windEl = document.getElementById("wind");
  const humidityEl = document.getElementById("humidity");
  const iconEl = document.getElementById("weatherIcon");

  const forecastBlock = document.getElementById("forecastBlock");
  const forecastTable = document.getElementById("forecastTable");

  const loading = document.getElementById("loading");
  const errorBox = document.getElementById("error");

  const suggestionBox = document.getElementById("suggestions");
  let debounceTimer = null;

  cityInput.addEventListener("input", () => {
    const query = cityInput.value.trim();

    clearTimeout(debounceTimer);

    if (query.length < 2) {
      suggestionBox.style.display = "none";
      suggestionBox.innerHTML = "";
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchGeoSuggestions(query);
    }, 300);
  });

  function fetchGeoSuggestions(query) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=ru&format=json`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const results = data.results;
        suggestionBox.innerHTML = "";

        if (!results || results.length === 0) {
          suggestionBox.style.display = "none";
          return;
        }

        results.forEach(city => {
          const item = document.createElement("div");
          item.className = "suggestion-item";

          const label = city.admin1
            ? `${city.name}, ${city.admin1}, ${city.country}`
            : `${city.name}, ${city.country}`;

          item.textContent = label;

          item.onclick = () => {
            cityInput.value = city.name;
            suggestionBox.style.display = "none";

            getWeather(city.latitude, city.longitude, city.name);
          };

          suggestionBox.appendChild(item);
        });

        suggestionBox.style.display = "block";
      })
      .catch(err => {
        console.error("Ошибка подсказок:", err);
        suggestionBox.style.display = "none";
      });
  }

  function getIcon(code) {
    if (code === 0) return "img/icons/clear.svg";
    if ([1, 2].includes(code)) return "img/icons/partly-cloudy.svg";
    if (code === 3) return "img/icons/cloudy.svg";
    if ([45, 48].includes(code)) return "img/icons/fog.svg";
    if ([51, 53, 55].includes(code)) return "img/icons/drizzle.svg";
    if ([61, 63, 65].includes(code)) return "img/icons/rain.svg";
    if ([71, 73, 75, 85, 86].includes(code)) return "img/icons/snow.svg";
    if ([80, 81, 82].includes(code)) return "img/icons/showers.svg";
    if ([95, 96, 99].includes(code)) return "img/icons/thunder.svg";
    return "img/icons/clear.svg";
  }

  async function getCoordsByCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("Город не найден");
    }

    return {
      lat: data.results[0].latitude,
      lon: data.results[0].longitude,
      name: data.results[0].name
    };
  }

  function formatDate(dateStr) {
    const months = [
       "января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    const [year, month, day] = dateStr.split("-");
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
  }

  async function getWeather(lat, lon, nameOverride = "Ваш город") {
    loading.classList.remove("hidden");
    errorBox.classList.add("hidden");

    const url = `
      https://api.open-meteo.com/v1/forecast
      ?latitude=${lat}
      &longitude=${lon}
      &current_weather=true
      &daily=weathercode,temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max
      &timezone=auto
      &wind_speed_unit=ms
    `.replace(/\s+/g, "");

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!data.current_weather) {
        throw new Error("Нет данных о погоде");
      }

      const cw = data.current_weather;

      cityNameEl.textContent = nameOverride;
      descEl.textContent = "Текущая погода";
      tempEl.textContent = `${Math.round(cw.temperature)}°C`;
      windEl.textContent = `Ветер: ${cw.windspeed} м/с`;
      humidityEl.textContent = "";

      iconEl.src = getIcon(cw.weathercode);
      iconEl.alt = `Код погоды ${cw.weathercode}`;

      currentWeather.classList.remove("hidden");

      forecastTable.innerHTML = "";
      const d = data.daily;

      for (let i = 0; i < d.time.length; i++) {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${formatDate(d.time[i])}</td>

          <td>${Math.round(d.temperature_2m_min[i])}° / ${Math.round(d.temperature_2m_max[i])}°</td>
          <td><img class="forecast-icon" src="${getIcon(d.weathercode[i])}" alt=""></td>

          <td>${d.windspeed_10m_max[i]} м/с</td>
          <td>${d.precipitation_sum[i]} мм</td>
        `;

        forecastTable.appendChild(row);
      }

      forecastBlock.classList.remove("hidden");

    } catch (err) {
      currentWeather.classList.add("hidden");
      forecastBlock.classList.add("hidden");
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    } finally {
      loading.classList.add("hidden");
    }
  }


  getWeatherBtn.addEventListener("click", async () => {
    const city = cityInput.value.trim();
    if (!city) return;

    try {
      const { lat, lon, name } = await getCoordsByCity(city);
      await getWeather(lat, lon, name);
    } catch (err) {
      currentWeather.classList.add("hidden");
      forecastBlock.classList.add("hidden");
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });

  function autolocate() {
    note.textContent = "Определяем город...";

    if (!navigator.geolocation) {
      note.textContent = "Геолокация не поддерживается";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        note.textContent = "Город найден, загружаем погоду...";
        await getWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        note.textContent = "Введите город вручную";
      }
    );
  }

  autolocate();


  const bgMountain = document.querySelector(".bg-mountain");
  if (bgMountain) {
    const bgImg = new Image();
    bgImg.src = "mountain.jpg";

    const updateMountainSize = () => {
      if (!bgImg.naturalHeight) return;

      const scale = Math.min(
        window.innerHeight / bgImg.naturalHeight,
        1
      );

      bgMountain.style.backgroundSize = `auto ${bgImg.naturalHeight * scale}px`;
    };

    bgImg.onload = updateMountainSize;
    window.addEventListener("resize", updateMountainSize);
  }


  const snowCanvas = document.getElementById("snowCanvas");
  const snowCtx = snowCanvas.getContext("2d");

  let sw, sh;
  function resizeSnow() {
    sw = snowCanvas.width = window.innerWidth;
    sh = snowCanvas.height = window.innerHeight;

  }
  resizeSnow();
  window.addEventListener("resize", resizeSnow);

  const FLAKES = 180;
  
  const flakes = [];
  for (let i = 0; i < FLAKES; i++) {
      flakes.push({
        x: Math.random() * sw,
        y: Math.random() * sh,
        r: 1.5 + Math.random() * 2.5,
        speed: 0.5 + Math.random() * 1.5,
        drift: Math.random() * 1 - 0.5,
        opacity: 0.4 + Math.random() * 0.6
      });
  }

  function animateSnow() {
    snowCtx.clearRect(0, 0, sw, sh);

    for (let f of flakes) {
      snowCtx.beginPath();
      snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      snowCtx.fillStyle = `rgba(255,255,255,${f.opacity})`;
      snowCtx.fill();

      f.y += f.speed;
      f.x += f.drift;

      f.x += Math.sin(f.y * 0.01) * 0.3;

      if (f.y > sh) {
          f.y = -10;
          f.x = Math.random() * sw;
      }
    }

    requestAnimationFrame(animateSnow);
  }
  animateSnow();
});



