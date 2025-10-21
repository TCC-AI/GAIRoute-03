// ============================================
// 快取管理器 - 獨立檔案
// 用途：加速頁面切換，不影響現有功能
// ============================================

const DashboardCache = {
  CACHE_KEY: 'gai_dashboard_cache',
  CACHE_DURATION: 30 * 60 * 1000, // 30分鐘
  
  /**
   * 獲取快取
   */
  get() {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // 檢查是否過期
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        this.clear();
        return null;
      }

      return data;
    } catch (error) {
      console.error('讀取快取失敗:', error);
      return null;
    }
  },

  /**
   * 儲存快取
   */
  set(data) {
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('儲存快取失敗:', error);
    }
  },

  /**
   * 清除快取
   */
  clear() {
    sessionStorage.removeItem(this.CACHE_KEY);
  },

  /**
   * 檢查是否有效
   */
  isValid() {
    const cached = sessionStorage.getItem(this.CACHE_KEY);
    if (!cached) return false;

    try {
      const { timestamp } = JSON.parse(cached);
      return (Date.now() - timestamp) <= this.CACHE_DURATION;
    } catch {
      return false;
    }
  }
};
