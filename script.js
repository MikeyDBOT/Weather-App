google.charts.load('current', { packages: ['corechart'] });

document.addEventListener('DOMContentLoaded', () => {
  const weatherContainer = document.getElementById('weather-container');

  // Get user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch weather data from Open-Meteo API
          const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=precipitation,temperature_2m&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
          
          const response = await fetch(apiUrl);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Generate labels for the days of the week
          const daysOfWeek = ["Today", "Tomorrow"];
          const currentDate = new Date();
          for (let i = 2; i < 7; i++) {
            const nextDate = new Date(currentDate);
            nextDate.setDate(currentDate.getDate() + i);
            daysOfWeek.push(nextDate.toLocaleDateString('en-US', { weekday: 'long' }));
          }

          // Map weather codes to icons
          const weatherIcons = {
            0: '☀️', // Clear sky
            1: '🌤️', // Mainly clear
            2: '⛅', // Partly cloudy
            3: '☁️', // Overcast
            45: '🌫️', // Fog
            48: '🌫️', // Depositing rime fog
            51: '🌦️', // Drizzle: Light
            53: '🌦️', // Drizzle: Moderate
            55: '🌦️', // Drizzle: Dense
            61: '🌧️', // Rain: Slight
            63: '🌧️', // Rain: Moderate
            65: '🌧️', // Rain: Heavy
            80: '🌦️', // Rain showers: Slight
            81: '🌦️', // Rain showers: Moderate
            82: '🌧️', // Rain showers: Violent
            95: '⛈️', // Thunderstorm: Slight or moderate
            96: '⛈️', // Thunderstorm with slight hail
            99: '⛈️', // Thunderstorm with heavy hail
          };

          // Display weather data in card format
          weatherContainer.innerHTML = '<h2></h2>';
          for (let i = 0; i < daysOfWeek.length; i++) {
            const weatherCode = data.daily.weathercode[i];
            const weatherIcon = weatherIcons[weatherCode] || '❓'; // Default icon for unknown codes

            // Calculate the correct hourly range for each day
            const startHourIndex = i * 24;
            const endHourIndex = startHourIndex + 24;
            const hourlyPrecipitation = data.hourly.precipitation.slice(startHourIndex, endHourIndex);

            // Check if there is any rain for the day
            const hasRain = hourlyPrecipitation.some((precip) => precip > 0);

            // Generate labels for hourly data
            const hourlyLabels = Array.from({ length: hourlyPrecipitation.length }, (_, hour) => `${hour}:00`);

            // Prepare data for the table
            const tableRows = hourlyPrecipitation.map((precip, hour) => {
              return `<tr><td>${hourlyLabels[hour]}</td><td>${Math.max(0, precip)} mm</td></tr>`;
            }).join('');

            // Add current temperature in bold (value only) for Today only, with normal font size
            let currentTempHtml = '';
            if (i === 0 && data.current_weather && typeof data.current_weather.temperature === 'number') {
              currentTempHtml = `<p>Current Temp: <span style="font-weight:bold;">${data.current_weather.temperature}°C</span></p>`;
            }

            // Always show the temperature table button and a table for Today, with real data if available
            let tempTableHtml = '';
            let tempTableButtonHtml = '';
            {
              // Build temperature table for today using robust ISO string matching and API timezone
              // Simple: just show the raw hourly.time and temperature_2m values for the first 24 hours
              // Show only the time (HH:MM) in the temperature table
              let tempTableRows = '';
              if (data.hourly && Array.isArray(data.hourly.temperature_2m) && Array.isArray(data.hourly.time)) {
                // Find the index of the first hour that is >= current local time, matching the API's timezone
                const now = new Date();
                // The API returns times in the requested timezone (auto), so we need to format local time to match
                const pad = n => n.toString().padStart(2, '0');
                const localIso = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
                let startIdx = data.hourly.time.findIndex(t => t >= localIso);
                if (startIdx === -1) startIdx = 0; // fallback to start if not found
                tempTableRows = data.hourly.time.slice(startIdx, startIdx + 24).map((t, i) => {
                  const timeOnly = t.split('T')[1]?.slice(0, 5) || t;
                  const temp = data.hourly.temperature_2m[startIdx + i] !== undefined ? data.hourly.temperature_2m[startIdx + i] : '-';
                  return `<tr><td>${timeOnly}</td><td>${temp}</td></tr>`;
                }).join('');
              } else {
                tempTableRows = Array.from({length: 24}, (_, hour) => {
                  return `<tr><td>-</td><td>-</td></tr>`;
                }).join('');
              }
              tempTableButtonHtml = `
                <button id="showTempTableBtn-${i}" style="white-space:normal;max-width:100%;overflow:visible;text-overflow:unset;display:block;margin:0 auto;font-size:clamp(10px,2vw,15px);padding:4px 8px;box-sizing:border-box;width:100%;" onclick="document.getElementById('tempTable-${i}').classList.toggle('hidden');">Show Temperature Table</button>
              `;
              tempTableHtml = `
                <div id="tempTable-${i}" class="hidden">
                  <table>
                    <thead>
                      <tr><th>Time</th><th>Temperature</th></tr>
                    </thead>
                    <tbody>
                      ${tempTableRows}
                    </tbody>
                  </table>
                </div>
              `;
            }

            // Add a dropdown with a table of times and rain amounts
            weatherContainer.innerHTML += `
              <div class="weather-card">
                <h4>${daysOfWeek[i]}</h4>
                <div class="weather-icon">${weatherIcon}</div>
                ${currentTempHtml}
                <p>Max Temp: ${data.daily.temperature_2m_max[i]}°C</p>
                <p>Min Temp: ${data.daily.temperature_2m_min[i]}°C</p>
                <p>Rain: ${data.daily.precipitation_sum[i]} mm</p>
                ${hasRain ? `<h5>Hourly Rain Breakdown</h5><div id=\"rainChart-${i}\" style=\"width: 100%; height: 200px;\"></div>` : '<p>No rain expected.</p>'}
                ${hasRain ? `<button onclick=\"document.getElementById('rainTable-${i}').classList.toggle('hidden')\">Show Rain Table</button>
                <div id=\"rainTable-${i}\" class=\"hidden\">
                  <table>
                    <thead>
                      <tr><th>Time</th><th>Rain (mm)</th></tr>
                    </thead>
                    <tbody>
                      ${tableRows}
                    </tbody>
                  </table>
                </div>` : ''}
                ${i === 0 ? tempTableButtonHtml + tempTableHtml : ''}
              </div>
            `;

            if (hasRain) {
              // Prepare data for Google Charts
              const chartData = [['Hour', 'Rain (mm)']];
              hourlyPrecipitation.forEach((precip, hour) => {
                chartData.push([hourlyLabels[hour], Math.max(0, precip)]); // Ensure no negative values
              });

              // Render the chart using Google Charts
              google.charts.setOnLoadCallback(() => {
                const chart = new google.visualization.LineChart(document.getElementById(`rainChart-${i}`));
                const dataTable = google.visualization.arrayToDataTable(chartData);
                const options = {
                  title: 'Hourly Rain (mm)',
                  curveType: 'function',
                  legend: { position: 'bottom' },
                  hAxis: {
                    title: 'Time',
                    textStyle: { fontSize: 16, bold: true }, // Increase font size for time labels
                    slantedText: true, // Ensure labels are slanted for better visibility
                    slantedTextAngle: 45, // Set slant angle
                  },
                  vAxis: {
                    title: 'Rain (mm)',
                    viewWindow: { min: 0, max: 5 }, // Ensure the y-axis starts at 0 and scales appropriately
                    textStyle: { fontSize: 14 },
                  },
                };
                chart.draw(dataTable, options);
              });
            }
          }
        } catch (error) {
          console.error('Error fetching weather data:', error); // Log detailed error
          weatherContainer.innerHTML = `<p>Failed to fetch weather data. Please try again later.</p>`;
        }
      },
      (error) => {
        console.error('Geolocation error:', error); // Log geolocation error
        weatherContainer.innerHTML = `<p>Unable to retrieve your location. Please ensure location services are enabled.</p>`;
      }
    );
  } else {
    console.error('Geolocation not supported by browser'); // Log unsupported geolocation
    weatherContainer.innerHTML = `<p>Geolocation is not supported by your browser.</p>`;
  }
});