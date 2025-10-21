// ============================================
// 主控台資料快取管理器
// ============================================

class DashboardCacheManager {
  constructor() {
    this.CACHE_KEY = 'gai_dashboard_cache';
    this.CACHE_DURATION = 30 * 60 * 1000; // 30分鐘
    this.isUpdating = false; // 防止重複更新
  }

  /**
   * 獲取快取的資料
   * @returns {Object|null} 快取的資料或 null
   */
  getCache() {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      // 檢查是否過期
      if (now - timestamp > this.CACHE_DURATION) {
        console.log('📦 快取已過期，需要重新載入');
        this.clearCache();
        return null;
      }

      const remainingTime = Math.floor((this.CACHE_DURATION - (now - timestamp)) / 1000 / 60);
      console.log(`✅ 使用快取資料 (剩餘有效時間: ${remainingTime}分鐘)`);
      
      return data;
    } catch (error) {
      console.error('❌ 讀取快取失敗:', error);
      return null;
    }
  }

  /**
   * 儲存資料到快取
   * @param {Object} data - 要快取的資料
   */
  setCache(data) {
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 資料已快取 (30分鐘有效)');
    } catch (error) {
      console.error('❌ 儲存快取失敗:', error);
      // sessionStorage 可能已滿，清除舊資料
      if (error.name === 'QuotaExceededError') {
        this.clearCache();
        console.log('🧹 清除舊快取後重試...');
        try {
          sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
        } catch (retryError) {
          console.error('❌ 重試失敗:', retryError);
        }
      }
    }
  }

  /**
   * 清除快取
   */
  clearCache() {
    sessionStorage.removeItem(this.CACHE_KEY);
    console.log('🗑️ 快取已清除');
  }

  /**
   * 檢查快取是否有效
   * @returns {boolean}
   */
  isCacheValid() {
    const cached = sessionStorage.getItem(this.CACHE_KEY);
    if (!cached) return false;

    try {
      const { timestamp } = JSON.parse(cached);
      return (Date.now() - timestamp) <= this.CACHE_DURATION;
    } catch {
      return false;
    }
  }

  /**
   * 獲取快取剩餘時間（分鐘）
   * @returns {number}
   */
  getRemainingTime() {
    const cached = sessionStorage.getItem(this.CACHE_KEY);
    if (!cached) return 0;

    try {
      const { timestamp } = JSON.parse(cached);
      const remaining = this.CACHE_DURATION - (Date.now() - timestamp);
      return Math.max(0, Math.floor(remaining / 1000 / 60));
    } catch {
      return 0;
    }
  }
}

// 建立全域實例
const dashboardCache = new DashboardCacheManager();
