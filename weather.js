(() => {
  'use strict';

  const pill = document.getElementById('weatherPill');
  const icon = document.getElementById('weatherIcon');
  const temperature = document.getElementById('weatherTemp');
  const condition = document.getElementById('weatherCondition');
  const place = pill?.querySelector('em');
  if (!pill || !icon || !temperature || !condition || !place) return;

  const SEOUL = { latitude: 37.5665, longitude: 126.9780 };
  const weatherLabels = code => {
    if (code === 0) return ['맑음','sunny'];
    if (code === 1) return ['대체로 맑음','partly_cloudy_day'];
    if (code === 2) return ['구름 조금','partly_cloudy_day'];
    if (code === 3) return ['흐림','cloud'];
    if ([45,48].includes(code)) return ['안개','foggy'];
    if ([51,53,55,56,57].includes(code)) return ['이슬비','rainy'];
    if ([61,63,65,66,67,80,81,82].includes(code)) return ['비','rainy'];
    if ([71,73,75,77,85,86].includes(code)) return ['눈','weather_snowy'];
    if ([95,96,99].includes(code)) return ['천둥·번개','thunderstorm'];
    return ['날씨 확인','partly_cloudy_day'];
  };

  async function loadWeather(latitude, longitude, locationLabel, isFallback = false) {
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude.toFixed(4));
      url.searchParams.set('longitude', longitude.toFixed(4));
      url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
      url.searchParams.set('timezone', 'auto');
      const response = await fetch(url);
      if (!response.ok) throw new Error('weather response');
      const data = await response.json();
      const current = data.current;
      if (!current || !Number.isFinite(current.temperature_2m)) throw new Error('weather data');
      const [text, symbol] = weatherLabels(Number(current.weather_code));
      temperature.textContent = `${Math.round(current.temperature_2m)}°`;
      condition.textContent = isFallback ? `${text} · 위치 꺼짐` : text;
      place.textContent = locationLabel;
      icon.textContent = current.is_day === 0 && symbol === 'sunny' ? 'clear_night' : symbol;
      pill.href = `https://www.google.com/search?q=${encodeURIComponent(`${latitude},${longitude} 날씨`)}`;
      pill.title = `${locationLabel} 현재 날씨 · 제공 Open-Meteo`;
      pill.classList.remove('weather-loading','weather-error');
    } catch (_) {
      temperature.textContent = '--°';
      condition.textContent = '날씨 불러오기 실패';
      place.textContent = locationLabel;
      icon.textContent = 'cloud_off';
      pill.title = '날씨를 다시 불러오려면 누르세요.';
      pill.classList.remove('weather-loading');
      pill.classList.add('weather-error');
    }
  }

  function requestLocation() {
    pill.classList.add('weather-loading');
    temperature.textContent = '--°';
    condition.textContent = '현재 위치 확인 중';
    place.textContent = '내 위치';
    if (!navigator.geolocation) {
      loadWeather(SEOUL.latitude, SEOUL.longitude, '서울', true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => loadWeather(position.coords.latitude, position.coords.longitude, '내 위치'),
      () => loadWeather(SEOUL.latitude, SEOUL.longitude, '서울', true),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 }
    );
  }

  pill.addEventListener('click', event => {
    if (!pill.classList.contains('weather-error')) return;
    event.preventDefault();
    requestLocation();
  });
  requestLocation();
})();
