/**
 * 中国省会城市天气 - 核心逻辑
 * 数据来源: Open-Meteo API (免费, 无需 API Key)
 */

// ===== Configuration =====
const CONFIG = {
  CACHE_KEY: 'weather_capitals_data',
  CACHE_TTL: 30 * 60 * 1000,     // 30 分钟缓存
  BATCH_SIZE: 6,                  // 每批并发请求数
  BATCH_DELAY: 200,               // 批次间延迟 (ms)
  REQUEST_TIMEOUT: 8000,          // 单个请求超时 (ms)
};

// ===== City Data =====
// 34 个省级行政中心 (含直辖市、自治区首府、特别行政区)
const CITIES = [
  // ---- 华北 ----
  { name: '北京', province: '北京市', lat: 39.9042, lon: 116.4074, region: '华北' },
  { name: '天津', province: '天津市', lat: 39.1252, lon: 117.1905, region: '华北' },
  { name: '石家庄', province: '河北省', lat: 38.0428, lon: 114.5149, region: '华北' },
  { name: '太原', province: '山西省', lat: 37.8706, lon: 112.5489, region: '华北' },
  { name: '呼和浩特', province: '内蒙古自治区', lat: 40.8424, lon: 111.7492, region: '华北' },

  // ---- 东北 ----
  { name: '哈尔滨', province: '黑龙江省', lat: 45.8038, lon: 126.5349, region: '东北' },
  { name: '长春', province: '吉林省', lat: 43.8178, lon: 125.3235, region: '东北' },
  { name: '沈阳', province: '辽宁省', lat: 41.8057, lon: 123.4315, region: '东北' },

  // ---- 华东 ----
  { name: '上海', province: '上海市', lat: 31.2304, lon: 121.4737, region: '华东' },
  { name: '南京', province: '江苏省', lat: 32.0603, lon: 118.7969, region: '华东' },
  { name: '杭州', province: '浙江省', lat: 30.2741, lon: 120.1551, region: '华东' },
  { name: '合肥', province: '安徽省', lat: 31.8206, lon: 117.2272, region: '华东' },
  { name: '福州', province: '福建省', lat: 26.0745, lon: 119.2965, region: '华东' },
  { name: '南昌', province: '江西省', lat: 28.6820, lon: 115.8582, region: '华东' },
  { name: '济南', province: '山东省', lat: 36.6518, lon: 116.9821, region: '华东' },

  // ---- 华中 ----
  { name: '郑州', province: '河南省', lat: 34.7466, lon: 113.6254, region: '华中' },
  { name: '武汉', province: '湖北省', lat: 30.5928, lon: 114.3055, region: '华中' },
  { name: '长沙', province: '湖南省', lat: 28.2282, lon: 112.9388, region: '华中' },

  // ---- 华南 ----
  { name: '广州', province: '广东省', lat: 23.1291, lon: 113.2644, region: '华南' },
  { name: '南宁', province: '广西壮族自治区', lat: 22.8170, lon: 108.3665, region: '华南' },
  { name: '海口', province: '海南省', lat: 20.0156, lon: 110.3492, region: '华南' },

  // ---- 西南 ----
  { name: '重庆', province: '重庆市', lat: 29.5630, lon: 106.5516, region: '西南' },
  { name: '成都', province: '四川省', lat: 30.5728, lon: 104.0668, region: '西南' },
  { name: '贵阳', province: '贵州省', lat: 26.6470, lon: 106.6302, region: '西南' },
  { name: '昆明', province: '云南省', lat: 25.0410, lon: 102.7039, region: '西南' },
  { name: '拉萨', province: '西藏自治区', lat: 29.6500, lon: 91.1000, region: '西南' },

  // ---- 西北 ----
  { name: '西安', province: '陕西省', lat: 34.3416, lon: 108.9398, region: '西北' },
  { name: '兰州', province: '甘肃省', lat: 36.0611, lon: 103.8343, region: '西北' },
  { name: '西宁', province: '青海省', lat: 36.6171, lon: 101.7785, region: '西北' },
  { name: '银川', province: '宁夏回族自治区', lat: 38.4872, lon: 106.2309, region: '西北' },
  { name: '乌鲁木齐', province: '新疆维吾尔自治区', lat: 43.8256, lon: 87.6168, region: '西北' },

  // ---- 港澳台 ----
  { name: '香港', province: '香港特别行政区', lat: 22.3193, lon: 114.1694, region: '港澳台' },
  { name: '澳门', province: '澳门特别行政区', lat: 22.1987, lon: 113.5439, region: '港澳台' },
  { name: '台北', province: '台湾省', lat: 25.0330, lon: 121.5654, region: '港澳台' },
];

// ===== Weather Code Mapping (WMO) =====
const WEATHER_MAP = {
  0:  { icon: '☀️',  desc: '晴天' },
  1:  { icon: '🌤️', desc: '少云' },
  2:  { icon: '⛅',  desc: '多云' },
  3:  { icon: '☁️',  desc: '阴天' },
  45: { icon: '🌫️', desc: '雾' },
  48: { icon: '🌫️', desc: '雾凇' },
  51: { icon: '🌦️', desc: '小毛毛雨' },
  53: { icon: '🌦️', desc: '毛毛雨' },
  55: { icon: '🌧️', desc: '大毛毛雨' },
  56: { icon: '🌧️', desc: '冻毛毛雨' },
  57: { icon: '🌧️', desc: '较强冻毛毛雨' },
  61: { icon: '🌧️', desc: '小雨' },
  63: { icon: '🌧️', desc: '中雨' },
  65: { icon: '🌧️', desc: '大雨' },
  66: { icon: '🌧️', desc: '小冻雨' },
  67: { icon: '🌧️', desc: '较强冻雨' },
  71: { icon: '❄️',  desc: '小雪' },
  73: { icon: '❄️',  desc: '中雪' },
  75: { icon: '❄️',  desc: '大雪' },
  77: { icon: '🌨️', desc: '雪粒' },
  80: { icon: '🌦️', desc: '小阵雨' },
  81: { icon: '🌦️', desc: '阵雨' },
  82: { icon: '⛈️',  desc: '强阵雨' },
  85: { icon: '🌨️', desc: '小阵雪' },
  86: { icon: '🌨️', desc: '阵雪' },
  95: { icon: '⛈️',  desc: '雷暴' },
  96: { icon: '⛈️',  desc: '雷暴伴小冰雹' },
  99: { icon: '⛈️',  desc: '雷暴伴大冰雹' },
};

function getWeatherInfo(code) {
  return WEATHER_MAP[code] || { icon: '🌡️', desc: '未知' };
}

// ===== Temperature Classification =====
function getTempClass(temp) {
  if (temp <= 0)  return 'temp-cold';
  if (temp <= 10) return 'temp-cool';
  if (temp <= 20) return 'temp-mild';
  if (temp <= 30) return 'temp-warm';
  return 'temp-hot';
}

// ===== DOM Elements =====
const mainContent = document.getElementById('mainContent');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const btnRefresh = document.getElementById('btnRefresh');
const statCount = document.getElementById('statCount');
const statAvg = document.getElementById('statAvg');
const statHottest = document.getElementById('statHottest');
const statColdest = document.getElementById('statColdest');
const statTime = document.getElementById('statTime');

// ===== State =====
let weatherData = [];           // { city, weather, error }
let activeFilter = '';

// ===== Cache =====
function loadCache() {
  try {
    const raw = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CONFIG.CACHE_TTL) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: data,
    }));
  } catch { /* quota exceeded, ignore */ }
}

// ===== API =====
async function fetchCityWeather(city, signal) {
  const url = [
    `https://api.open-meteo.com/v1/forecast`,
    `?latitude=${city.lat}`,
    `&longitude=${city.lon}`,
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`,
    `&timezone=Asia/Shanghai`,
  ].join('');

  const resp = await fetch(url, { signal });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const json = await resp.json();
  const cur = json.current;

  return {
    temp: Math.round(cur.temperature_2m),
    humidity: cur.relative_humidity_2m,
    code: cur.weather_code,
    wind: cur.wind_speed_10m,
    time: cur.time,
  };
}

async function fetchWithTimeout(city, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const data = await fetchCityWeather(city, controller.signal);
    clearTimeout(timer);
    return { city, weather: data, error: null };
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? '请求超时' : `请求失败: ${err.message}`;
    return { city, weather: null, error: msg };
  }
}

async function fetchAllWeather() {
  const batchSize = CONFIG.BATCH_SIZE;
  const results = [];

  for (let i = 0; i < CITIES.length; i += batchSize) {
    const batch = CITIES.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(city => fetchWithTimeout(city, CONFIG.REQUEST_TIMEOUT))
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({ city: null, weather: null, error: r.reason?.message || '未知错误' });
      }
    }

    // Delay between batches to be nice to the API
    if (i + batchSize < CITIES.length) {
      await new Promise(r => setTimeout(r, CONFIG.BATCH_DELAY));
    }
  }

  // Map results back to cities for any that got lost
  for (let i = 0; i < results.length; i++) {
    if (!results[i].city) {
      results[i].city = CITIES[i];
    }
  }

  return results;
}

// ===== Rendering =====
function createCardHtml(item, index) {
  const { city, weather, error } = item;

  // Error state
  if (error || !weather) {
    return `
      <div class="weather-card error-card" style="animation-delay:${index * 0.03}s">
        <div class="card-header">
          <div>
            <div class="card-city">${city.name}</div>
            <div class="card-province">${city.province}</div>
          </div>
          <div class="card-weather-icon">⚠️</div>
        </div>
        <div class="card-error">${error || '数据加载失败'}</div>
        <span class="card-retry" data-city-index="${CITIES.indexOf(city)}">点击重试</span>
      </div>
    `;
  }

  // Success state
  const { temp, humidity, code, wind } = weather;
  const wi = getWeatherInfo(code);
  const tempClass = getTempClass(temp);

  return `
    <div class="weather-card ${tempClass}" style="animation-delay:${index * 0.03}s">
      <div class="card-header">
        <div>
          <div class="card-city">${city.name}</div>
          <div class="card-province">${city.province}</div>
        </div>
        <div class="card-weather-icon" title="${wi.desc}">${wi.icon}</div>
      </div>
      <div class="card-body">
        <span class="card-temp">${temp}</span>
        <span class="card-temp-unit">°C</span>
      </div>
      <div class="card-desc">${wi.desc}</div>
      <div class="card-footer">
        <div class="card-detail" title="湿度">
          <span class="card-detail-icon">💧</span>
          <span>${humidity}%</span>
        </div>
        <div class="card-detail" title="风速">
          <span class="card-detail-icon">💨</span>
          <span>${wind} km/h</span>
        </div>
      </div>
    </div>
  `;
}

function createSkeletonHtml(city, index) {
  return `
    <div class="weather-card skeleton" style="animation-delay:${index * 0.03}s">
      <div class="card-header">
        <div style="flex:1">
          <div class="skeleton-line sk-city"></div>
          <div class="skeleton-line sk-province"></div>
        </div>
        <div class="skeleton-line sk-icon"></div>
      </div>
      <div class="skeleton-line sk-temp"></div>
      <div class="skeleton-line sk-desc"></div>
      <div class="skeleton-line sk-detail"></div>
    </div>
  `;
}

function groupByRegion(items) {
  const order = ['华北', '东北', '华东', '华中', '华南', '西南', '西北', '港澳台'];
  const groups = {};

  for (const item of items) {
    const region = item.city.region;
    if (!groups[region]) groups[region] = [];
    groups[region].push(item);
  }

  return order.filter(r => groups[r]).map(r => ({ region: r, items: groups[r] }));
}

function renderAll(items) {
  if (items.length === 0) {
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">没有找到匹配的城市</div>
      </div>
    `;
    return;
  }

  const groups = groupByRegion(items);

  let html = '';
  let cardIndex = 0;
  for (const group of groups) {
    html += '<section class="region-section">';
    html += `<h2 class="region-title">${group.region}</h2>`;
    html += '<div class="cards-grid">';
    for (const item of group.items) {
      html += createCardHtml(item, cardIndex++);
    }
    html += '</div></section>';
  }

  mainContent.innerHTML = html;

  // Bind retry buttons
  mainContent.querySelectorAll('.card-retry').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.cityIndex);
      if (isNaN(idx)) return;
      const city = CITIES[idx];
      btn.textContent = '加载中...';
      btn.style.pointerEvents = 'none';
      const result = await fetchWithTimeout(city, CONFIG.REQUEST_TIMEOUT);
      // Replace in weatherData
      const dataIdx = weatherData.findIndex(d => d.city === city);
      if (dataIdx >= 0) weatherData[dataIdx] = result;
      filterAndRender();
    });
  });
}

function renderSkeletons() {
  const groups = groupByRegion(CITIES.map(c => ({ city: c })));
  let html = '';
  let cardIndex = 0;
  for (const group of groups) {
    html += '<section class="region-section">';
    html += `<h2 class="region-title">${group.region}</h2>`;
    html += '<div class="cards-grid">';
    for (const item of group.items) {
      html += createSkeletonHtml(item.city, cardIndex++);
    }
    html += '</div></section>';
  }
  mainContent.innerHTML = html;
}

function updateStats(items) {
  const valid = items.filter(i => i.weather);
  const count = valid.length;
  const total = items.length;

  statCount.textContent = `${count}/${total}`;

  if (count === 0) {
    statAvg.textContent = '--°';
    statHottest.textContent = '--';
    statColdest.textContent = '--';
    return;
  }

  const temps = valid.map(i => i.weather.temp);
  const avg = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
  const max = Math.max(...temps);
  const min = Math.min(...temps);

  const hottestCity = valid.find(i => i.weather.temp === max);
  const coldestCity = valid.find(i => i.weather.temp === min);

  statAvg.textContent = `${avg}°C`;
  statHottest.textContent = `${hottestCity.city.name} ${max}°`;
  statColdest.textContent = `${coldestCity.city.name} ${min}°`;

  // Time from first valid item
  if (valid[0]?.weather?.time) {
    const d = new Date(valid[0].weather.time);
    statTime.textContent = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
}

// ===== Filter =====
function filterAndRender() {
  const query = activeFilter.trim().toLowerCase();
  let items = weatherData;

  if (query) {
    items = weatherData.filter(item => {
      return item.city.name.includes(query) ||
             item.city.province.includes(query) ||
             item.city.region.includes(query);
    });
  }

  renderAll(items);
  updateStats(weatherData);
}

// ===== Event Handlers =====
searchInput.addEventListener('input', () => {
  activeFilter = searchInput.value;
  searchClear.classList.toggle('hidden', !activeFilter);
  filterAndRender();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  activeFilter = '';
  searchClear.classList.add('hidden');
  filterAndRender();
  searchInput.focus();
});

btnRefresh.addEventListener('click', async () => {
  btnRefresh.classList.add('loading');
  btnRefresh.disabled = true;
  await loadWeather(true);
  btnRefresh.classList.remove('loading');
  btnRefresh.disabled = false;
});

// ===== Main Load =====
async function loadWeather(skipCache = false) {
  // Try cache first
  if (!skipCache) {
    const cached = loadCache();
    if (cached) {
      weatherData = cached;
      filterAndRender();
      return;
    }
  }

  // Show skeletons
  renderSkeletons();

  // Fetch all
  weatherData = await fetchAllWeather();

  // Save cache for successful fetches
  const toCache = weatherData.filter(d => d.weather);
  if (toCache.length > 0) {
    saveCache(weatherData);
  }

  // Render
  filterAndRender();
}

// ===== Initialize =====
(async function init() {
  await loadWeather();
})();
