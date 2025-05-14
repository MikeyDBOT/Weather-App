document.addEventListener('DOMContentLoaded', () => {
  const weatherContainer = document.getElementById('weather-container');

  // Get user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch weather data from Open-Meteo API
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const data = await response.json();

          // Display weather data
          weatherContainer.innerHTML = `
            <h2>Current Weather</h2>
            <p>Temperature: <strong>${data.current_weather.temperature}°C</strong></p>
            <p>Wind Speed: ${data.current_weather.windspeed} km/h</p>
          `;
        } catch (error) {
          weatherContainer.innerHTML = `<p>Failed to fetch weather data. Please try again later.</p>`;
        }
      },
      () => {
        weatherContainer.innerHTML = `<p>Unable to retrieve your location.</p>`;
      }
    );
  } else {
    weatherContainer.innerHTML = `<p>Geolocation is not supported by your browser.</p>`;
  }
});