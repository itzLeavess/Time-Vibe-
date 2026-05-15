import { app, BrowserWindow, Menu, Tray, nativeImage, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'clock-config.json');

let appConfig = {
  position: 'top-right',
  duration: 10,
  frequency: 1
};

try {
  if (fs.existsSync(configPath)) {
    appConfig = { ...appConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  }
} catch (e) {
  console.error('Failed to load config', e);
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(appConfig));
  } catch (e) {
    console.error('Failed to save config', e);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let previewTimer = null;

let dndTimer = null;
let dndEndTime = appConfig.dndEndTime || 0;

function checkDnd() {
  if (Date.now() >= dndEndTime) {
    setDnd(0);
  } else {
    updateTrayMenu();
  }
}

function setDnd(minutes) {
  if (minutes === 0) {
    if (dndTimer) clearInterval(dndTimer);
    dndTimer = null;
    dndEndTime = 0;
    appConfig.dndEndTime = 0;
  } else {
    dndEndTime = Date.now() + minutes * 60 * 1000;
    appConfig.dndEndTime = dndEndTime;
    if (dndTimer) clearInterval(dndTimer);
    dndTimer = setInterval(checkDnd, 1000);
  }
  saveConfig();
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-config', appConfig);
  }
  updateTrayMenu();
}

if (dndEndTime > Date.now()) {
  dndTimer = setInterval(checkDnd, 1000);
} else {
  dndEndTime = 0;
  appConfig.dndEndTime = 0;
}


function showPreview() {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('show-preview');
  }
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('hide-preview');
    }
  }, 5000);
}

function updateConfigAndPreview(key, value) {
  appConfig[key] = value;
  saveConfig();
  updateWindowPosition(key !== 'position'); // 只在改变 position 时使用平滑动画
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-config', appConfig);
  }
  showPreview();
  updateTrayMenu();
}

function updateTrayMenu() {
  const isDndActive = Date.now() < dndEndTime;
  let dndSubmenu = [];
  if (isDndActive) {
    const remainingMs = dndEndTime - Date.now();
    let timeStr = '';
    if (remainingMs > 120 * 60000) {
      timeStr = Math.ceil(remainingMs / (60 * 60000)) + ' 小时';
    } else if (remainingMs > 2 * 60000) {
      timeStr = Math.ceil(remainingMs / 60000) + ' 分钟';
    } else {
      timeStr = Math.ceil(remainingMs / 1000) + ' 秒';
    }
    
    dndSubmenu = [
      { label: `提前结束免打扰 (剩 ${timeStr})`, click: () => setDnd(0) },
      { type: 'separator' },
      { label: '30分钟', enabled: false },
      { label: '1小时', enabled: false },
      { label: '2小时', enabled: false },
      { label: '6小时', enabled: false },
      { label: '12小时', enabled: false },
      { label: '24小时', enabled: false },
    ];
  } else {
    dndSubmenu = [
      { label: '30分钟', click: () => setDnd(30) },
      { label: '1小时', click: () => setDnd(60) },
      { label: '2小时', click: () => setDnd(120) },
      { label: '6小时', click: () => setDnd(360) },
      { label: '12小时', click: () => setDnd(720) },
      { label: '24小时', click: () => setDnd(1440) },
    ];
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '免打扰模式',
      submenu: dndSubmenu
    },
    { type: 'separator' },
    {
      label: '位置预设',
      submenu: [
        { label: '右上角', type: 'radio', checked: appConfig.position === 'top-right', click: () => updateConfigAndPreview('position', 'top-right') },
        { label: '左上角', type: 'radio', checked: appConfig.position === 'top-left', click: () => updateConfigAndPreview('position', 'top-left') },
        { label: '右下角', type: 'radio', checked: appConfig.position === 'bottom-right', click: () => updateConfigAndPreview('position', 'bottom-right') },
        { label: '左下角', type: 'radio', checked: appConfig.position === 'bottom-left', click: () => updateConfigAndPreview('position', 'bottom-left') },
      ]
    },
    {
      label: '显示时长',
      submenu: [
        { label: '10秒', type: 'radio', checked: appConfig.duration === 10, click: () => updateConfigAndPreview('duration', 10) },
        { label: '20秒', type: 'radio', checked: appConfig.duration === 20, click: () => updateConfigAndPreview('duration', 20) },
        { label: '30秒', type: 'radio', checked: appConfig.duration === 30, click: () => updateConfigAndPreview('duration', 30) },
      ]
    },
    {
      label: '报时频率',
      submenu: [
        { label: '每30秒', type: 'radio', checked: appConfig.frequency === 0.5, click: () => updateConfigAndPreview('frequency', 0.5) },
        { label: '每1分钟', type: 'radio', checked: appConfig.frequency === 1, click: () => updateConfigAndPreview('frequency', 1) },
        { label: '每30分钟', type: 'radio', checked: appConfig.frequency === 30, click: () => updateConfigAndPreview('frequency', 30) },
        { label: '每1小时', type: 'radio', checked: appConfig.frequency === 60, click: () => updateConfigAndPreview('frequency', 60) },
      ]
    },
    { label: '自定义', enabled: false },
    { type: 'separator' },
    { label: '演示预览', click: () => showPreview() },
    { label: '退出', click: () => app.quit() }
  ]);
  
  const iconName = isDndActive ? 'dndTemplate.png' : 'iconTemplate.png';
  const iconPathAssets = path.join(__dirname, 'assets', iconName);
  const iconPathOriginal = path.join(__dirname, 'assets', 'iconTemplate.png');
  const iconPathUserData = path.join(app.getPath('userData'), 'trayIcon.png');
  
  let icon;
  let hasImage = false;
  let usingFallbackIconForDnd = false;

  // 优先加载 dnd 专用 icon (如果开启了免打扰且提供了 dndTemplate.png)
  if (isDndActive && fs.existsSync(iconPathAssets)) {
    icon = nativeImage.createFromPath(iconPathAssets);
    icon.setTemplateImage(true);
    hasImage = true;
  } else if (!isDndActive && fs.existsSync(iconPathOriginal)) {
    icon = nativeImage.createFromPath(iconPathOriginal);
    icon.setTemplateImage(true);
    hasImage = true;
  } else if (fs.existsSync(iconPathOriginal)) { 
    // 回退到默认 icon
    icon = nativeImage.createFromPath(iconPathOriginal);
    icon.setTemplateImage(true);
    hasImage = true;
    if (isDndActive) usingFallbackIconForDnd = true;
  } else {
    if (!fs.existsSync(iconPathUserData)) {
      const b64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsEAAA7BAbiRa+0AAAAlSURBVDhPY2AYBaNgFIyCUcAAAAEQAAGW+0XAAAAAAElFTkSuQmCC';
      fs.writeFileSync(iconPathUserData, Buffer.from(b64, 'base64'));
    }
    icon = nativeImage.createFromPath(iconPathUserData);
  }

  if (!tray) {
    tray = new Tray(icon);
  } else {
    tray.setImage(icon);
  }

  // 如果使用了内置图片或者没有图片，设置相应的 title
  if (!hasImage) {
    tray.setTitle(isDndActive ? '⏳ 🔕' : '⏳ ');
  } else if (usingFallbackIconForDnd) {
    tray.setTitle(' 🔕');
  } else {
    // macOS 支持给图片额外设置 title（比如文字提示），正常情况置空
    tray.setTitle('');
  }

  tray.setContextMenu(contextMenu);
}

let contentSize = null;
let positionAnimation = null;
let isInitialPositionSet = false;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animatePosition(targetX, targetY, instant) {
  if (!mainWindow) return;

  // 严格检查坐标，确保始终传入有限的数字
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    return;
  }

  targetX = Math.round(targetX);
  targetY = Math.round(targetY);

  if (instant || !isInitialPositionSet) {
    if (positionAnimation) {
      clearTimeout(positionAnimation.timer);
      positionAnimation = null;
    }
    try {
      mainWindow.setPosition(targetX, targetY, false);
    } catch(e) {}
    isInitialPositionSet = true;
    return;
  }

  const startBounds = mainWindow.getBounds();
  const startX = Number.isFinite(startBounds.x) ? startBounds.x : targetX;
  const startY = Number.isFinite(startBounds.y) ? startBounds.y : targetY;

  if (startX === targetX && startY === targetY) {
    return;
  }

  if (positionAnimation) {
    clearTimeout(positionAnimation.timer);
    positionAnimation = null;
  }

  const dxTotal = targetX - startX;
  const dyTotal = targetY - startY;
  const duration = 900; // 回归固定的优雅时间（900ms），保持最好的物理惯性感
  const startTime = Date.now();

  function step() {
    if (!mainWindow) return;
    const now = Date.now();
    const elapsed = now - startTime;
    let progress = elapsed / duration;

    if (progress >= 1) progress = 1;

    const easedProgress = easeInOutCubic(progress);
    let currentX = Math.round(startX + (targetX - startX) * easedProgress);
    let currentY = Math.round(startY + (targetY - startY) * easedProgress);

    // 双重保险，防止传递 NaN 导致 Electron 底层 C++ 转换报错
    if (!Number.isFinite(currentX)) currentX = targetX;
    if (!Number.isFinite(currentY)) currentY = targetY;

    try {
      mainWindow.setPosition(currentX, currentY, false);
    } catch(e) {
      // 忽略位置设置可能导致的底层转化异常
    }

    // 计算速度 (基于 cubic 缓出缓入的导数) 
    // velocityFactor 代表 d(easedProgress)/d(progress)
    const velocityFactor = progress < 0.5 ? 12 * progress * progress : 12 * (1 - progress) * (1 - progress);
    
    // 恢复自然速度，靠前端的非线性函数去放大短边视觉效果
    const vX = dxTotal * velocityFactor;
    const vY = dyTotal * velocityFactor;
    
    try {
      mainWindow.webContents.send('window-moving', { dx: vX, dy: vY, progress });
    } catch (e) {}

    if (progress < 1) {
      positionAnimation.timer = setTimeout(step, 16);
    } else {
      positionAnimation = null;
      try {
        mainWindow.webContents.send('window-moving-end');
      } catch (e) {}
    }
  }

  positionAnimation = { timer: setTimeout(step, 16) };
}

function updateWindowPosition(instant = false) {
  if (!mainWindow) return;
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;
  const workArea = display.workArea;
  const winBounds = mainWindow.getBounds();
  
  // 1. 基础定义 (v1.0.1)
  // 如果前端 React 已经发来了通过 ResizeObserver 监听到的实际尺寸，则使用监听数值；
  // 如果前端尚未渲染加载完成，则先使用一个预估值作为 fallback。
  const W_ui = contentSize ? contentSize.width : 255; 
  const H_ui = contentSize ? contentSize.height : 50;
  const P = 20;     // Padding (边界间距)

  // 计算“实际可用区域”：屏幕尺寸减去系统菜单栏 (通常在顶部)
  // 我们忽略底部的 Dock/任务栏 (即 clock 可以覆盖它们)，除非用户明确要求避开所有 workArea
  const menuBarHeight = Math.max(0, workArea.y - bounds.y);
  const areaX = bounds.x;
  const areaY = bounds.y + menuBarHeight;
  const areaWidth = bounds.width;
  const areaHeight = bounds.height - menuBarHeight;

  // 2. 计算中心点 (Xc, Yc)
  let Xc, Yc;
  
  switch(appConfig.position) {
    case 'top-left': 
      Xc = areaX + P + (0.5 * W_ui);
      Yc = areaY + P + (0.5 * H_ui);
      break;
    case 'top-right': 
      Xc = areaX + areaWidth - P - (0.5 * W_ui);
      Yc = areaY + P + (0.5 * H_ui);
      break;
    case 'bottom-left': 
      Xc = areaX + P + (0.5 * W_ui);
      Yc = areaY + areaHeight - P - (0.5 * H_ui);
      break;
    case 'bottom-right': 
      Xc = areaX + areaWidth - P - (0.5 * W_ui);
      Yc = areaY + areaHeight - P - (0.5 * H_ui);
      break;
    default:
      Xc = areaX + areaWidth - P - (0.5 * W_ui);
      Yc = areaY + P + (0.5 * H_ui);
      break;
  }
  
  // 3. 将物理窗口的位置对齐到计算出的中心点
  // 窗口中心 = UI中心
  const x = Math.round(Xc - (winBounds.width / 2));
  const y = Math.round(Yc - (winBounds.height / 2));

  animatePosition(x, y, instant);
}

let isFirstSizeUpdate = true;

ipcMain.on('update-size', (event, size) => {
  if (size && size.width > 0 && size.height > 0) {
    contentSize = {
      width: Math.round(size.width),
      height: Math.round(size.height)
    };
    updateWindowPosition(isFirstSizeUpdate);
    isFirstSizeUpdate = false;
  }
});

ipcMain.handle('get-config', () => appConfig);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 350,
    height: 120,
    x: -60,
    y: -25,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  updateTrayMenu();
  updateWindowPosition(true);

  // 启用点击穿透，且 forward: true 允许网页接收鼠标移动事件 (用于 hover)
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide(); // 隐藏 dock 图标
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

