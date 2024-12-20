import { CONFIG } from './config.js';


document.getElementById('latlongbutton').addEventListener('click', () => {
  document.getElementById('cityform').classList.add('hidden');
  document.getElementById('latlongform').classList.remove('hidden');
  document.getElementById('latlongbutton').classList.replace('unactive', 'active');
  document.getElementById('citybutton').classList.replace('active', 'unactive');
});

document.getElementById('citybutton').addEventListener('click', () => {
  document.getElementById('latlongform').classList.add('hidden');
  document.getElementById('cityform').classList.remove('hidden');
  document.getElementById('citybutton').classList.replace('unactive', 'active');
  document.getElementById('latlongbutton').classList.replace('active', 'unactive');
});

document.getElementById('latlongform').addEventListener('submit', function (event) {
  event.preventDefault();
  const formData = new FormData(this);
  const data = {};
  formData.forEach((value, key) => {
      data[key] = value;
  });
  api(data['lat'], data['lon']);
});

document.getElementById('cityform').addEventListener('submit', function (event) {
  event.preventDefault();
  const formData = new FormData(this);
  const data = {};
  formData.forEach((value, key) => {
      data[key] = value;
  });

  const apiKey = CONFIG.API_KEY;
  const city = data['city'];
  const country = data['country'];

  fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},${country}&limit=1&appid=${apiKey}`)
      .then(response => response.json())
      .then(data => {
          api(data[0].lat, data[0].lon);
      })
      .catch(error => console.error('Error:', error));
});

function convertEpochToTime(epoch, timezoneOffset) {
  const localTime = new Date((epoch + timezoneOffset) * 1000);
  const hours = localTime.getUTCHours().toString().padStart(2, '0');
  const minutes = localTime.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getDate(epoch, timezoneOffset){
  const localTime = new Date((epoch + timezoneOffset) * 1000);

    // Extract date components
    const day = localTime.getUTCDate().toString().padStart(2, '0');
    const month = (localTime.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
    const year = localTime.getUTCFullYear();

    return `${day}-${month}-${year} `;
}

function api(lat, lon) {
  const apiKey = CONFIG.API_KEY;

  const OWM_Endpoint = "https://api.openweathermap.org/data/2.5/forecast";

  const weatherParams = {
      lat: lat,
      lon: lon,
      appid: apiKey,
      cnt: 4,
      units: 'metric'
  };

  const queryString = new URLSearchParams(weatherParams).toString();

  fetch(`${OWM_Endpoint}?${queryString}`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(weatherData => {
          const epochTime = Math.trunc(Date.now() / 1000);
          const sunriseTime = weatherData.city.sunrise;
          const sunsetTime = weatherData.city.sunset;
          let sky = epochTime < sunriseTime || epochTime > sunsetTime ? 'Dark' : 'Bright';
          let precipitation="";
          let minT = Infinity;
          let maxT = -Infinity;
          let avgT = 0;
          let avgHum = 0;
          let weatherID = 0;
          let cloudcover = 0;
          let pop = 0;
          let visibility = 0;
          let forecastList = [];
          let overalliconsrc = "";
          let overallimgsrc = "";
          console.log(weatherData)

          weatherData.list.forEach(item => {
              const forecast = {
                  dt_txt: `${getDate(item.dt, weatherData.city.timezone)} ${convertEpochToTime(item.dt, weatherData.city.timezone)}`,
                  details: [
                      { label: 'Precipitation Probability(%) ', value: (100 * item.pop).toFixed(2) },
                      { label: 'Humidity (%) ', value: item.main.humidity },
                      { label: 'Temperature (℃) ', value: item.main.temp },
                  ],
                  icon: item.weather[0].icon
              };
              forecastList.push(forecast);

              minT = Math.min(minT, item.main.temp_min);
              maxT = Math.max(maxT, item.main.temp_max);
              avgT += item.main.temp / weatherData.list.length;
              avgHum += item.main.humidity / weatherData.list.length;
              cloudcover += item.clouds.all / weatherData.list.length;
              
              visibility += item.visibility?item.visibility / weatherData.list.length:0;
              pop += (item.pop * 100) / weatherData.list.length;
          });

          avgT = Number(avgT.toFixed(2));
          weatherID = weatherData.list[0].weather[0].id;

          if (weatherID < 300) {
              overalliconsrc = sky === 'Bright' ? "11d" : "11n";
              overallimgsrc = "assets/images/thunder.avif";
              precipitation = "Thunderstorm"
          } else if (weatherID < 600) {
              overalliconsrc = sky === 'Bright' ? "09d" : "09n";
              overallimgsrc = sky === "Bright" ? "assets/images/rainyd.webp" : "assets/images/rainyn.webp";
              precipitation = "Rain"
          } else if (weatherID < 700) {
              overalliconsrc = "13d";
              overallimgsrc = sky === "Bright" ? "assets/images/snow.avif" : "assets/images/snown.jpeg";
              precipitation = "Snow"
          } else {
              overalliconsrc = sky === "Bright" ? "01d" : "01n";
              overallimgsrc = sky === "Bright" ? "assets/images/bgd.webp" : "assets/images/clearskyn.avif";
              precipitation = "Clear"
          }

          const Info = {
              location: {
                  city: weatherData.city.name,
                  country: weatherData.city.country,
                  coord: { lat, lon },
                  sunrise: convertEpochToTime(weatherData.city.sunrise, weatherData.city.timezone),
                  sunset: convertEpochToTime(weatherData.city.sunset, weatherData.city.timezone),
              },
              temp: { avg: avgT, min: minT, max: maxT },
              sky: sky,
              hourlyForecast: forecastList,
              general: [
                  { icon: "assets/images/icons/umbrella.png", title: `${precipitation}`, value: `${pop}% Chance` },
                  { icon: "assets/images/icons/cloud.png", title: "Cloud-Cover", value: `${cloudcover} %` },
                  { icon: "assets/images/icons/humidity.png", title: "Humidity", value: `${avgHum} %` },
                  { icon: "assets/images/icons/binoculars.png", title: "Visibility", value: `${visibility} m` },
              ],
              images: { overalliconsrc, overallimgsrc }
          };

          displayWeatherInfo(Info);
          
      })
      .catch(error => console.error("Error fetching weather data:", error));
  
}

function displayWeatherInfo(info) {
  const body = document.getElementsByTagName('body')[0];
  body.style.backgroundImage = `url(${info.images.overallimgsrc})`;
  body.style.backgroundRepeat = 'no-repeat';
  body.style.backgroundSize = 'cover';
  body.style.transition = 'background 1s ease-in-out';

  const container = document.getElementById('output');
  container.innerHTML = '';

  const cityDiv = document.createElement('div');
  cityDiv.className = 'city';

  const lat = info.location.coord.lat >= 0 ? `${Number(info.location.coord.lat).toFixed(2)}ºN` : `${-1*Number(info.location.coord.lat).toFixed(2)}ºS`;
  const lon = info.location.coord.lon >= 0 ? `${Number(info.location.coord.lon).toFixed(2)}ºE` : `${-Number(info.location.coord.lon).toFixed(2)}ºW`;
  cityDiv.textContent = info.location.city ? `${info.location.city}, ${info.location.country}` : `${lat}, ${lon}`;
  container.appendChild(cityDiv);

  const imgTempDiv = document.createElement('div');
  imgTempDiv.className = 'imgtemp';

  const image2Div = document.createElement('div');
  image2Div.className = 'image2';
  const image2 = document.createElement('img');
  image2.src = `https://openweathermap.org/img/wn/${info.images.overalliconsrc}@2x.png`;
  image2.style.height = '300px';
  image2Div.appendChild(image2);
  imgTempDiv.appendChild(image2Div);

  const ssdata = document.createElement('div');
  ssdata.className = 'ssdata';

  const sunrise = document.createElement('div');
  sunrise.className = 'ssdataitem';
  const sunriseImg = document.createElement('img');
  sunriseImg.src = "assets/images/icons/sunrise.png";
  sunrise.appendChild(sunriseImg);
  const sunriseVal = document.createElement('div');
  sunriseVal.textContent = info.location.sunrise;
  sunrise.appendChild(sunriseVal);

  const sunset = document.createElement('div');
  sunset.className = 'ssdataitem';
  const sunsetImg = document.createElement('img');
  sunsetImg.src = "assets/images/icons/sunset.png";
  sunset.appendChild(sunsetImg);
  const sunsetVal = document.createElement('div');
  sunsetVal.textContent = info.location.sunset;
  sunset.appendChild(sunsetVal);

  const coord = document.createElement('div');
  coord.className = 'ssdataitem';
  const coordImg = document.createElement('img');
  coordImg.src = "assets/images/icons/coordinates.png";
  coord.appendChild(coordImg);
  const coordVal = document.createElement('div');
  coordVal.textContent = `${lat}, ${lon}`;
  coord.appendChild(coordVal);

  ssdata.appendChild(sunrise);
  ssdata.appendChild(sunset);
  ssdata.appendChild(coord);
  imgTempDiv.appendChild(ssdata);

  const tempInfoDiv = document.createElement('div');
  tempInfoDiv.className = 'tempinfo';

  const avgTempDiv = document.createElement('div');
  avgTempDiv.className = 'avgtemp';
  avgTempDiv.textContent = `${info.temp.avg} ℃`;
  tempInfoDiv.appendChild(avgTempDiv);

  const tempRangeDiv = document.createElement('div');
  tempRangeDiv.className = 'temprange';
  tempRangeDiv.textContent = `${info.temp.min} ℃ - ${info.temp.max} ℃`;
  tempInfoDiv.appendChild(tempRangeDiv);

  imgTempDiv.appendChild(tempInfoDiv);
  container.appendChild(imgTempDiv);

  const generalInfoDiv = document.createElement('div');
  generalInfoDiv.className = 'generalinfo';

  info.general.forEach(detail => {
      const detailDiv = document.createElement('div');
      detailDiv.className = 'detail';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'icon';
      const iconImg = document.createElement('img');
      iconImg.src = detail.icon;
      iconDiv.appendChild(iconImg);
      detailDiv.appendChild(iconDiv);

      const titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.textContent = detail.title;
      detailDiv.appendChild(titleDiv);

      const valueDiv = document.createElement('div');
      valueDiv.className = 'value';
      valueDiv.textContent = detail.value;
      detailDiv.appendChild(valueDiv);

      generalInfoDiv.appendChild(detailDiv);
  });

  container.appendChild(generalInfoDiv);


const hourlyForecastDiv = document.createElement('div');
  hourlyForecastDiv.className = 'hourlyforecast';

  info.hourlyForecast.forEach(forecast => {
    const forecastDiv = document.createElement('div');
    forecastDiv.className = 'forecast';

    const timeDiv = document.createElement('div');
    timeDiv.className = 'time';
    timeDiv.textContent = forecast.dt_txt;
    forecastDiv.appendChild(timeDiv);

    const image3Div = document.createElement('div');
    image3Div.className = 'image3';
    const forecastImage = document.createElement('img');
    forecastImage.src = `https://openweathermap.org/img/wn/${forecast.icon}@2x.png`;
    image3Div.appendChild(forecastImage);
    forecastDiv.appendChild(image3Div);

    const table = document.createElement('table');
    forecast.details.forEach(detail => {
      const row = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = `${detail.label}:`;
      const td2 = document.createElement('td');
      td2.textContent = detail.value;
      row.appendChild(td1);
      row.appendChild(td2);
      table.appendChild(row);
    });
    forecastDiv.appendChild(table);

    hourlyForecastDiv.appendChild(forecastDiv);
  });

  container.appendChild(hourlyForecastDiv);
}
