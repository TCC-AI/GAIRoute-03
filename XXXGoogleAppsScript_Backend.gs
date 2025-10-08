// ===== 昶青智慧冷鏈物流-派車GAI數據管理系統 - Google Apps Script 後端 =====
// 版本: 1.0.0
// 作者: 昶青智慧冷鏈物流技術團隊
// 最後更新: 2025-01-27

// ===== 全域配置 =====
const CONFIG = {
  // 主要資料表 ID
  MAIN_SPREADSHEET_ID: '1miCf_ZTVyzmA1MNbbZM3uUdZjluk99gZUH5w2q_XWs8',
  
  // 外部資料表 ID (GAI分析、託收託運回報等)
  EXTERNAL_SPREADSHEET_ID: '1YMYLTvbAZjUxtOrtavzOCSTt0U5NfZN7S825TQmflbc',
  
  // 工作表名稱配置
  SHEETS: {
    DASHBOARD: '主控台',
    ROUTES: '路線管理',
    OPTIMIZATION: 'GAI-精準智慧物流路徑規劃',
    SEASONAL: '季節性路線',
    CARGO_VEHICLE: '載運管理',
    REALTIME: '即時監控',
    SETTINGS: '系統設定',
    LOGS: '報表分析',
    USERS: '管制名單',
    DELIVERY_REPORT: '託收託運回報',
    GAI_ANALYSIS: 'GAI每日訂單分析',
    ROUTE_TABLES: '路線表'
  },
  
  // ChatGPT API 配置
  OPENAI_API_KEY: 'your-openai-api-key-here', // 請替換為您的 OpenAI API Key
  OPENAI_MODEL: 'gpt-3.5-turbo',
  
  // 天氣 API 配置
  WEATHER_API_KEY: 'a4806bc2577c0c227f9acd8bccb566a5'
};

// ===== 主要處理函數 =====
function doPost(e) {
  try {
    // 解析請求資料
    const requestData = JSON.parse(e.postData.contents);
    const { action, data, timestamp, user } = requestData;
    
    console.log(`收到請求: ${action} 來自用戶: ${user}`);
    
    // 根據動作類型處理請求
    let result;
    switch (action) {
      // ===== 認證相關 =====
      case 'authenticateUser':
        result = authenticateUser(data);
        break;
        
      case 'updateLastLoginTime':
        result = updateLastLoginTime(data);
        break;
        
      // ===== 主控台資料 =====
      case 'getDashboardData':
        result = getDashboardData();
        break;
        
      case 'getRoutePalletSum':
        result = getRoutePalletSum(data);
        break;
        
      case 'getRoutePalletNonZeroCount':
        result = getRoutePalletNonZeroCount(data);
        break;
        
      case 'getRoutePalletNonZeroPercentage':
        result = getRoutePalletNonZeroPercentage(data);
        break;
        
      case 'getRouteTableLastBValue':
        result = getRouteTableLastBValue(data);
        break;
        
      case 'getRouteTableAlertValue':
        result = getRouteTableAlertValue(data);
        break;
        
      // ===== 路線管理 =====
      case 'getRouteTableFromExternalSheet':
        result = getRouteTableFromExternalSheet(data);
        break;
        
      case 'processRouteAddresses':
        result = processRouteAddresses(data);
        break;
        
      case 'searchRoutes':
        result = searchRoutes(data);
        break;
        
      case 'addRoute':
        result = addRoute(data);
        break;
        
      case 'deleteRoute':
        result = deleteRoute(data);
        break;
        
      // ===== 託收託運回報 =====
      case 'setSpecifiedDate':
        result = setSpecifiedDate(data);
        break;
        
      case 'getDeliveryPoints':
        result = getDeliveryPoints(data);
        break;
        
      case 'getFilteredDeliveryReport':
        result = getFilteredDeliveryReport(data);
        break;
        
      // ===== GAI 分析 =====
      case 'getLatestOrderAnalysis':
        result = getLatestOrderAnalysis(data);
        break;
        
      case 'processChatGPTQuery':
        result = processChatGPTQuery(data);
        break;
        
      // ===== 路線預排 =====
      case 'getCurrentDayRouteTableA':
        result = getCurrentDayRouteTableA(data);
        break;
        
      case 'getCurrentDayRouteTableB':
        result = getCurrentDayRouteTableB(data);
        break;
        
      case 'getCurrentDayRouteTableC':
        result = getCurrentDayRouteTableC(data);
        break;
        
      case 'getTomorrowDispatchTable':
        result = getTomorrowDispatchTable(data);
        break;
        
      // ===== 系統功能 =====
      case 'initializeSheets':
        result = initializeSheets(data);
        break;
        
      case 'testConnection':
        result = { success: true, message: '連線正常' };
        break;
        
      case 'emergencyDispatch':
        result = emergencyDispatch(data);
        break;
        
      default:
        throw new Error(`未知的動作類型: ${action}`);
    }
    
    // 返回成功回應
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('處理請求時發生錯誤:', error);
    
    // 返回錯誤回應
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== 認證相關函數 =====
function authenticateUser(data) {
  const { username, password } = data;
  
  try {
    // 從管制名單工作表獲取使用者資料
    const usersSheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.USERS);
    
    if (!usersSheet) {
      throw new Error('找不到使用者資料表');
    }
    
    const userData = usersSheet.getDataRange().getValues();
    const headers = userData[0];
    const userRows = userData.slice(1);
    
    // 尋找匹配的使用者
    const userIndex = headers.indexOf('帳號');
    const passwordIndex = headers.indexOf('密碼');
    const nameIndex = headers.indexOf('姓名');
    const roleIndex = headers.indexOf('角色');
    const levelIndex = headers.indexOf('等級');
    
    if (userIndex === -1 || passwordIndex === -1) {
      throw new Error('使用者資料表格式錯誤');
    }
    
    for (let i = 0; i < userRows.length; i++) {
      const row = userRows[i];
      if (row[userIndex] === username && row[passwordIndex] === password) {
        return {
          username: username,
          name: row[nameIndex] || username,
          role: row[roleIndex] || '使用者',
          level: row[levelIndex] || 's1'
        };
      }
    }
    
    throw new Error('帳號或密碼錯誤');
    
  } catch (error) {
    console.error('認證失敗:', error);
    throw error;
  }
}

function updateLastLoginTime(data) {
  const { username, timestamp } = data;
  
  try {
    const usersSheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.USERS);
    
    if (!usersSheet) {
      throw new Error('找不到使用者資料表');
    }
    
    const userData = usersSheet.getDataRange().getValues();
    const headers = userData[0];
    const userIndex = headers.indexOf('帳號');
    const lastLoginIndex = headers.indexOf('最後登入時間');
    
    if (userIndex === -1 || lastLoginIndex === -1) {
      throw new Error('使用者資料表格式錯誤');
    }
    
    // 更新最後登入時間
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][userIndex] === username) {
        usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(timestamp);
        break;
      }
    }
    
    return { success: true, message: '登入時間已更新' };
    
  } catch (error) {
    console.error('更新登入時間失敗:', error);
    throw error;
  }
}

// ===== 主控台資料函數 =====
function getDashboardData() {
  try {
    // 這裡可以從各個工作表獲取統計資料
    // 目前返回模擬資料
    return {
      todayDeliveries: 156,
      vehicleUsage: 78,
      onTimeRate: 94,
      alertCount: 2
    };
  } catch (error) {
    console.error('獲取主控台資料失敗:', error);
    throw error;
  }
}

function getRoutePalletSum(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    console.log('getRoutePalletSum 開始執行，目標試算表 ID:', spreadsheetId);
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('託收託運回報');
    
    if (!sheet) {
      throw new Error('找不到託收託運回報工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    console.log('資料範圍行數:', dataRange.length);
    
    if (dataRange.length === 0) {
      console.log('資料範圍為空，返回 0');
      return 0;
    }
    
    const headers = dataRange[0];
    console.log('欄位標題:', headers);
    const palletColumnIndex = headers.indexOf('板數');
    
    if (palletColumnIndex === -1) {
      console.log('找不到板數欄位，可用欄位:', headers);
      throw new Error('找不到板數欄位');
    }
    
    console.log('板數欄位索引:', palletColumnIndex);
    
    let totalPallets = 0;
    for (let i = 1; i < dataRange.length; i++) {
      const palletValue = dataRange[i][palletColumnIndex];
      if (palletValue && !isNaN(palletValue)) {
        totalPallets += Number(palletValue);
      }
    }
    
    console.log('計算完成，總板數:', totalPallets);
    return totalPallets;
    
  } catch (error) {
    console.error('計算板數總和失敗:', error);
    throw error;
  }
}

function getRoutePalletNonZeroCount(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    console.log('getRoutePalletNonZeroCount 開始執行，目標試算表 ID:', spreadsheetId);
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('託收託運回報');
    
    if (!sheet) {
      throw new Error('找不到託收託運回報工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    console.log('資料範圍行數:', dataRange.length);
    
    if (dataRange.length === 0) {
      console.log('資料範圍為空，返回 0');
      return 0;
    }
    
    const headers = dataRange[0];
    console.log('欄位標題:', headers);
    const palletColumnIndex = headers.indexOf('板數');
    
    if (palletColumnIndex === -1) {
      console.log('找不到板數欄位，可用欄位:', headers);
      throw new Error('找不到板數欄位');
    }
    
    console.log('板數欄位索引:', palletColumnIndex);
    
    let nonZeroCount = 0;
    for (let i = 1; i < dataRange.length; i++) {
      const palletValue = dataRange[i][palletColumnIndex];
      if (palletValue && !isNaN(palletValue) && Number(palletValue) > 0) {
        nonZeroCount++;
      }
    }
    
    console.log('計算完成，非零板數次數:', nonZeroCount);
    return nonZeroCount;
    
  } catch (error) {
    console.error('計算非零板數次數失敗:', error);
    throw error;
  }
}

function getRoutePalletNonZeroPercentage(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('託收託運回報');
    
    if (!sheet) {
      throw new Error('找不到託收託運回報工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const totalRows = dataRange.length - 1; // 扣除標題行
    
    if (totalRows === 0) {
      return 0;
    }
    
    const nonZeroCount = getRoutePalletNonZeroCount(data);
    const percentage = Math.round((nonZeroCount / totalRows) * 100);
    
    return percentage;
    
  } catch (error) {
    console.error('計算非零板數百分比失敗:', error);
    throw error;
  }
}

function getRouteTableLastBValue(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('路線表');
    
    if (!sheet) {
      throw new Error('找不到路線表工作表');
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return 0;
    }
    
    // 獲取 B 欄位最後一列的值
    const lastBValue = sheet.getRange(lastRow, 2).getValue();
    return lastBValue || 0;
    
  } catch (error) {
    console.error('獲取路線表B欄位最後值失敗:', error);
    throw error;
  }
}

function getRouteTableAlertValue(data) {
  try {
    const lastBValue = getRouteTableLastBValue(data);
    // 計算異常警示值 (B欄位值 × 0.27 ÷ 1000)
    const alertValue = (lastBValue * 0.27) / 1000;
    return Math.round(alertValue * 100) / 100; // 四捨五入到小數點後兩位
    
  } catch (error) {
    console.error('計算異常警示值失敗:', error);
    throw error;
  }
}

// ===== 路線管理函數 =====
function getRouteTableFromExternalSheet(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('路線表');
    
    if (!sheet) {
      throw new Error('找不到路線表工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const rows = dataRange.slice(1);
    
    // 轉換為物件陣列
    const routes = rows.map(row => {
      const route = {};
      headers.forEach((header, index) => {
        route[header] = row[index] || '';
      });
      return route;
    });
    
    return routes;
    
  } catch (error) {
    console.error('獲取路線表失敗:', error);
    throw error;
  }
}

function processRouteAddresses(data) {
  try {
    const { routeData } = data;
    
    if (!routeData || !Array.isArray(routeData)) {
      throw new Error('路線資料格式錯誤');
    }
    
    const processedRoutes = routeData.map(route => {
      const addresses = [];
      
      // 處理地址欄位 (地址1 到 地址20)
      for (let i = 1; i <= 20; i++) {
        const addressKey = `地址${i}`;
        const address = route[addressKey];
        
        if (address && address.trim() !== '') {
          addresses.push({
            order: i,
            address: address.trim()
          });
        }
      }
      
      return {
        routeName: route['工作表名稱'] || route['路線名稱'] || '未命名路線',
        addressCount: addresses.length,
        totalKm: route['總公里數'] || 0,
        addresses: addresses
      };
    });
    
    return processedRoutes;
    
  } catch (error) {
    console.error('處理路線地址失敗:', error);
    throw error;
  }
}

function searchRoutes(data) {
  try {
    const { searchTerm, region } = data;
    const allRoutes = getRouteTableFromExternalSheet({ targetSpreadsheetId: CONFIG.EXTERNAL_SPREADSHEET_ID });
    
    if (!searchTerm && !region) {
      return allRoutes;
    }
    
    return allRoutes.filter(route => {
      const routeName = route['工作表名稱'] || route['路線名稱'] || '';
      const routeRegion = route['區域'] || '';
      
      const matchesSearch = !searchTerm || 
        routeName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRegion = !region || 
        routeRegion.toLowerCase().includes(region.toLowerCase());
      
      return matchesSearch && matchesRegion;
    });
    
  } catch (error) {
    console.error('搜尋路線失敗:', error);
    throw error;
  }
}

function addRoute(data) {
  try {
    const { name, startPoint, endPoint, stopPoints, estimatedTime } = data;
    
    const sheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.ROUTES);
    
    if (!sheet) {
      throw new Error('找不到路線管理工作表');
    }
    
    const newRow = [
      new Date(), // 建立時間
      name,
      startPoint,
      endPoint,
      stopPoints ? stopPoints.join(', ') : '',
      estimatedTime || 0,
      '啟用', // 狀態
      'system' // 建立者
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: '路線新增成功' };
    
  } catch (error) {
    console.error('新增路線失敗:', error);
    throw error;
  }
}

function deleteRoute(data) {
  try {
    const { routeId } = data;
    
    const sheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.ROUTES);
    
    if (!sheet) {
      throw new Error('找不到路線管理工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf('路線編號');
    
    if (idIndex === -1) {
      throw new Error('找不到路線編號欄位');
    }
    
    // 尋找並刪除指定路線
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][idIndex] === routeId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    
    return { success: true, message: '路線刪除成功' };
    
  } catch (error) {
    console.error('刪除路線失敗:', error);
    throw error;
  }
}

// ===== 託收託運回報函數 =====
function setSpecifiedDate(data) {
  try {
    const { date } = data;
    
    const sheet = SpreadsheetApp.openById(CONFIG.EXTERNAL_SPREADSHEET_ID)
      .getSheetByName('指定日期');
    
    if (!sheet) {
      // 如果工作表不存在，創建它
      const spreadsheet = SpreadsheetApp.openById(CONFIG.EXTERNAL_SPREADSHEET_ID);
      const newSheet = spreadsheet.insertSheet('指定日期');
      newSheet.getRange('A1').setValue('指定日期');
    }
    
    // 清除舊資料並寫入新日期
    sheet.clear();
    sheet.getRange('A1').setValue('指定日期');
    sheet.getRange('A2').setValue(date);
    
    return { success: true, message: '指定日期已設定' };
    
  } catch (error) {
    console.error('設定指定日期失敗:', error);
    throw error;
  }
}

function getDeliveryPoints(data) {
  try {
    const { date, targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('託收託運回報');
    
    if (!sheet) {
      throw new Error('找不到託收託運回報工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const orderDateIndex = headers.indexOf('下單日期');
    
    if (orderDateIndex === -1) {
      throw new Error('找不到下單日期欄位');
    }
    
    // 篩選符合日期的資料
    const filteredData = dataRange.slice(1).filter(row => {
      const rowDate = row[orderDateIndex];
      if (!rowDate) return false;
      
      // 格式化日期進行比較
      let formattedRowDate = '';
      if (rowDate instanceof Date) {
        formattedRowDate = Utilities.formatDate(rowDate, 'GMT+8', 'yyyy/M/d');
      } else if (typeof rowDate === 'string') {
        try {
          const parsedDate = new Date(rowDate);
          formattedRowDate = Utilities.formatDate(parsedDate, 'GMT+8', 'yyyy/M/d');
        } catch (e) {
          formattedRowDate = rowDate.split(' ')[0];
        }
      }
      
      return formattedRowDate === date;
    });
    
    // 轉換為物件陣列
    const deliveryPoints = filteredData.map(row => {
      const point = {};
      headers.forEach((header, index) => {
        point[header] = row[index] || '';
      });
      return point;
    });
    
    return deliveryPoints;
    
  } catch (error) {
    console.error('獲取託收託運回報失敗:', error);
    throw error;
  }
}

function getFilteredDeliveryReport(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('託收託運回報');
    
    if (!sheet) {
      throw new Error('找不到託收託運回報工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const rows = dataRange.slice(1);
    
    // 轉換為物件陣列
    const report = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    });
    
    return report;
    
  } catch (error) {
    console.error('獲取託收託運回報失敗:', error);
    throw error;
  }
}

// ===== GAI 分析函數 =====
function getLatestOrderAnalysis(data) {
  try {
    const { targetSpreadsheetId, sheetName } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    const sheetNameToUse = sheetName || CONFIG.SHEETS.GAI_ANALYSIS;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName(sheetNameToUse);
    
    if (!sheet) {
      throw new Error(`找不到 ${sheetNameToUse} 工作表`);
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const rows = dataRange.slice(1);
    
    // 轉換為物件陣列
    const analysis = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    });
    
    return analysis;
    
  } catch (error) {
    console.error('獲取GAI分析失敗:', error);
    throw error;
  }
}

function processChatGPTQuery(data) {
  try {
    const { userMessage, targetSpreadsheetId, sheetName } = data;
    
    // 獲取託收託運回報資料作為上下文
    const deliveryData = getFilteredDeliveryReport({ targetSpreadsheetId });
    
    // 構建 ChatGPT 請求
    const prompt = buildChatGPTPrompt(userMessage, deliveryData);
    
    // 調用 ChatGPT API
    const response = callChatGPTAPI(prompt);
    
    // 分析回應模式
    const mode = analyzeResponseMode(userMessage, response);
    
    return {
      reply: response,
      mode: mode,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('ChatGPT查詢處理失敗:', error);
    throw error;
  }
}

function buildChatGPTPrompt(userMessage, deliveryData) {
  let prompt = `你是一個專業的冷鏈物流派車助手。以下是託收託運回報的資料：

${JSON.stringify(deliveryData, null, 2)}

用戶問題：${userMessage}

請根據以上資料回答用戶的問題。回答要簡潔明瞭，並提供實用的建議。`;

  return prompt;
}

function callChatGPTAPI(prompt) {
  try {
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model: CONFIG.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一個專業的冷鏈物流派車助手，專門協助處理託收託運相關問題。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.choices && responseData.choices[0]) {
      return responseData.choices[0].message.content;
    } else {
      throw new Error('ChatGPT API 回應格式錯誤');
    }
    
  } catch (error) {
    console.error('ChatGPT API 調用失敗:', error);
    // 返回備用回應
    return `抱歉，我目前無法處理您的問題。請稍後再試或聯繫系統管理員。錯誤訊息：${error.message}`;
  }
}

function analyzeResponseMode(userMessage, response) {
  // 簡單的模式分析邏輯
  const quickKeywords = ['今天', '現在', '目前', '狀態', '數量', '多少'];
  const hasQuickKeyword = quickKeywords.some(keyword => 
    userMessage.includes(keyword)
  );
  
  if (hasQuickKeyword && response.length < 200) {
    return 'quick_answer';
  } else if (response.includes('分析') || response.includes('建議')) {
    return 'ai_analysis';
  } else {
    return 'fallback';
  }
}

// ===== 路線預排函數 =====
function getCurrentDayRouteTableA(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('當日各路線表(A)');
    
    if (!sheet) {
      throw new Error('找不到當日各路線表(A)工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const rows = dataRange.slice(1);
    
    // 轉換為物件陣列
    const routes = rows.map(row => {
      const route = {};
      headers.forEach((header, index) => {
        route[header] = row[index] || '';
      });
      return route;
    });
    
    return routes;
    
  } catch (error) {
    console.error('獲取當日各路線表(A)失敗:', error);
    throw error;
  }
}

function getCurrentDayRouteTableB(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('當日各路線表(B)');
    
    if (!sheet) {
      throw new Error('找不到當日各路線表(B)工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const rows = dataRange.slice(1);
    
    // 轉換為物件陣列
    const routes = rows.map(row => {
      const route = {};
      headers.forEach((header, index) => {
        route[header] = row[index] || '';
      });
      return route;
    });
    
    return routes;
    
  } catch (error) {
    console.error('獲取當日各路線表(B)失敗:', error);
    throw error;
  }
}

function getCurrentDayRouteTableC(data) {
  try {
    const { targetSpreadsheetId } = data;
    const spreadsheetId = targetSpreadsheetId || CONFIG.EXTERNAL_SPREADSHEET_ID;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName('當日各路線表(C)');
    
    if (!sheet) {
      throw new Error('找不到當日各路線表(C)工作表');
    }
    
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const rows = dataRange.slice(1);
    
    // 轉換為物件陣列
    const routes = rows.map(row => {
      const route = {};
      headers.forEach((header, index) => {
        route[header] = row[index] || '';
      });
      return route;
    });
    
    return routes;
    
  } catch (error) {
    console.error('獲取當日各路線表(C)失敗:', error);
    throw error;
  }
}

function getTomorrowDispatchTable(data) {
  try {
    // 這裡可以實作獲取明日派車表的邏輯
    // 目前返回模擬資料
    const mockData = [
      {
        '路線名稱': '台北市區線',
        '起點': '台北車站',
        '收送點1': '信義區(5板)',
        '收送點2': '大安區(3板)',
        '收送點3': '中正區(2板)',
        '總板數': 10,
        '預估時間': '120分鐘'
      },
      {
        '路線名稱': '新北環線',
        '起點': '板橋站',
        '收送點1': '淡水區(4板)',
        '收送點2': '三重區(3板)',
        '收送點3': '新莊區(2板)',
        '總板數': 9,
        '預估時間': '150分鐘'
      }
    ];
    
    return mockData;
    
  } catch (error) {
    console.error('獲取明日派車表失敗:', error);
    throw error;
  }
}

// ===== 系統功能函數 =====
function initializeSheets(data) {
  try {
    const { sheets } = data;
    const spreadsheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
    
    // 檢查並創建必要的工作表
    const sheetNames = Object.values(sheets || CONFIG.SHEETS);
    
    sheetNames.forEach(sheetName => {
      let sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        console.log(`已創建工作表: ${sheetName}`);
      }
    });
    
    return { message: '工作表初始化完成' };
    
  } catch (error) {
    console.error('工作表初始化失敗:', error);
    throw error;
  }
}

function emergencyDispatch(data) {
  try {
    const { type, location, description, priority } = data;
    
    // 記錄緊急調派事件
    const sheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID)
      .getSheetByName('緊急調派記錄');
    
    if (!sheet) {
      const spreadsheet = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
      const newSheet = spreadsheet.insertSheet('緊急調派記錄');
      newSheet.getRange('A1:E1').setValues([['時間', '類型', '地點', '描述', '優先級']]);
    }
    
    const newRow = [
      new Date(),
      type,
      location,
      description,
      priority
    ];
    
    sheet.appendRow(newRow);
    
    return {
      success: true,
      emergencyId: 'EMG' + Date.now(),
      message: '緊急調派已啟動',
      estimatedResponse: '15分鐘內'
    };
    
  } catch (error) {
    console.error('緊急調派失敗:', error);
    throw error;
  }
}

// ===== 工具函數 =====
function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '/');
}

function removeLeadingZero(dateStr) {
  return dateStr.replace(/\/0(\d)/g, '/$1');
}

// ===== 測試函數 =====
function testAllFunctions() {
  console.log('開始測試所有函數...');
  
  try {
    // 測試認證
    console.log('測試認證功能...');
    const authResult = authenticateUser({ username: 'admin', password: 'admin123' });
    console.log('認證結果:', authResult);
    
    // 測試主控台資料
    console.log('測試主控台資料...');
    const dashboardData = getDashboardData();
    console.log('主控台資料:', dashboardData);
    
    // 測試路線資料
    console.log('測試路線資料...');
    const routes = getRouteTableFromExternalSheet({ targetSpreadsheetId: CONFIG.EXTERNAL_SPREADSHEET_ID });
    console.log('路線數量:', routes.length);
    
    console.log('所有測試完成');
    
  } catch (error) {
    console.error('測試失敗:', error);
  }
}


