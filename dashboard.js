// ============================================
// 主控台頁面邏輯（修改版）
// ============================================

let currentDashboardData = null; // 當前顯示的資料

/**
 * 載入主控台資料（帶快取）
 * @param {boolean} forceRefresh - 是否強制重新載入
 */
async function loadDashboardData(forceRefresh = false) {
  console.log('🚀 開始載入主控台資料...');

  // 1. 如果不是強制重新整理，先檢查快取
  if (!forceRefresh) {
    const cachedData = dashboardCache.getCache();
    
    if (cachedData) {
      // 立即顯示快取資料
      console.log('⚡ 使用快取資料，立即顯示');
      currentDashboardData = cachedData;
      updateDashboardUI(cachedData);
      
      // 顯示快取資訊
      showCacheInfo();
      
      // 背景靜默更新（不顯示載入動畫）
      silentUpdateDashboard();
      return;
    }
  }

  // 2. 沒有快取或強制重新整理，顯示載入動畫
  showLoadingSpinner();

  try {
    const data = await fetchDashboardDataFromServer();
    
    // 儲存到快取
    dashboardCache.setCache(data);
    currentDashboardData = data;
    
    // 更新 UI
    updateDashboardUI(data);
    
    console.log('✅ 主控台資料載入完成');
    showSuccessMessage('資料載入完成');
    
  } catch (error) {
    console.error('❌ 載入失敗:', error);
    showErrorMessage('載入失敗: ' + error.message);
  } finally {
    hideLoadingSpinner();
  }
}

/**
 * 背景靜默更新（不顯示載入動畫）
 */
async function silentUpdateDashboard() {
  if (dashboardCache.isUpdating) {
    console.log('⏳ 已有更新任務進行中，跳過');
    return;
  }

  dashboardCache.isUpdating = true;
  console.log('🔄 背景靜默更新中...');

  try {
    const newData = await fetchDashboardDataFromServer();
    
    // 比較資料是否有變化
    if (JSON.stringify(newData) !== JSON.stringify(currentDashboardData)) {
      console.log('📊 資料已更新，重新快取');
      dashboardCache.setCache(newData);
      currentDashboardData = newData;
      updateDashboardUI(newData);
      showInfoMessage('資料已自動更新');
    } else {
      console.log('✓ 資料無變化');
    }
    
  } catch (error) {
    console.warn('⚠️ 背景更新失敗（不影響使用）:', error);
  } finally {
    dashboardCache.isUpdating = false;
  }
}

/**
 * 從伺服器獲取資料
 */
async function fetchDashboardDataFromServer() {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getDashboardData',
      userId: currentUser.id
    })
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || '載入失敗');
  }

  return result.data;
}

/**
 * 更新 UI 顯示
 */
function updateDashboardUI(data) {
  // 更新今日配送數
  document.getElementById('todayDeliveries').textContent = data.todayDeliveries || 0;
  
  // 更新車輛使用率
  document.getElementById('vehicleUsage').textContent = data.vehicleUsage || 0;
  
  // 更新準時率
  document.getElementById('onTimeRate').textContent = data.onTimeRate || 0;
  
  // 更新異常數量
  document.getElementById('alertCount').textContent = data.alertCount || 0;
  
  // 更新總距離
  document.getElementById('totalDistance').textContent = (data.totalDistance || 0).toFixed(1);
  
  // 更新總成本
  document.getElementById('totalCost').textContent = (data.totalCost || 0).toLocaleString();
  
  // 更新車輛狀態
  updateVehicleStatus(data.vehicleStatus);
  
  // 更新天氣資訊
  updateWeatherInfo(data.weather);
  
  // 更新警示列表
  updateAlertsList(data.alerts);
  
  console.log('🎨 UI 更新完成');
}

/**
 * 顯示快取資訊
 */
function showCacheInfo() {
  const remainingTime = dashboardCache.getRemainingTime();
  const infoElement = document.getElementById('cacheInfo');
  
  if (infoElement) {
    infoElement.textContent = `使用快取資料 (${remainingTime}分鐘後更新)`;
    infoElement.style.display = 'block';
    
    // 3秒後淡出
    setTimeout(() => {
      infoElement.style.opacity = '0';
      setTimeout(() => {
        infoElement.style.display = 'none';
        infoElement.style.opacity = '1';
      }, 300);
    }, 3000);
  }
}

/**
 * 手動重新整理按鈕
 */
function refreshDashboard() {
  console.log('🔄 使用者手動重新整理');
  dashboardCache.clearCache();
  loadDashboardData(true);
}

/**
 * 資料變更後自動清除快取
 */
function onDataChanged() {
  console.log('📝 資料已變更，清除快取');
  dashboardCache.clearCache();
  
  // 如果當前在主控台頁面，重新載入
  if (window.location.hash === '#dashboard' || window.location.hash === '') {
    loadDashboardData(true);
  }
}

// ============================================
// 頁面載入時執行
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // 初始載入
  loadDashboardData();
  
  // 綁定重新整理按鈕
  const refreshBtn = document.getElementById('refreshDashboardBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshDashboard);
  }
});
