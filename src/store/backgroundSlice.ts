import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface BackgroundImage {
  id: string;
  url: string;
  addedAt: number;
}

export interface BackgroundFilters {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  sepia: number;
  grayscale: number;
  invert: number;
  opacity: number;
}

export type BackgroundType = 'image' | 'solid' | 'gradient';

export type AutoSwitchMode = 'off' | 'onLoad' | 'daily';

export interface SolidBackground {
  color: string;
}

export interface GradientBackground {
  type: 'linear' | 'radial';
  colors: string[];
  direction?: string; // для linear: "to right", "45deg", etc.
  position?: string; // для radial: "center", "top left", etc.
  customCSS?: string; // Пользовательская CSS строка градиента
}

interface BackgroundState {
  images: BackgroundImage[];
  currentBackground: string | null; // ID изображения, а не URL
  isLoading: boolean;
  filters: BackgroundFilters;
  backgroundType: BackgroundType;
  solidBackground: SolidBackground;
  gradientBackground: GradientBackground;
  parallaxEnabled: boolean;
  shadowOverlay: {
    enabled: boolean;
    intensity: number; // 0-100, интенсивность затенения
    height: number; // 0-100, высота распространения затенения
  };
  autoSwitch: {
    enabled: boolean;
    mode: AutoSwitchMode;
    lastSwitchDate?: string; // для режима daily
  };
  borderlessBackground: boolean;
}

// Функции для работы с localStorage
const STORAGE_KEY = 'background-images';
const CURRENT_BG_KEY = 'current-background';
const FILTERS_KEY = 'background-filters';
const BG_TYPE_KEY = 'background-type';
const SOLID_BG_KEY = 'solid-background';
const GRADIENT_BG_KEY = 'gradient-background';
const PARALLAX_KEY = 'parallax-enabled';
const SHADOW_OVERLAY_KEY = 'shadow-overlay';
const AUTO_SWITCH_KEY = 'auto-switch';
const BORDERLESS_BACKGROUND_KEY = 'borderless-background';

const defaultFilters: BackgroundFilters = {
  blur: 0,
  brightness: 100, // Яркость по умолчанию 100% для естественного отображения
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
  opacity: 100
};

const defaultSolidBackground: SolidBackground = {
  color: '#1a1a1a'
};

const defaultGradientBackground: GradientBackground = {
  type: 'linear',
  colors: ['#667eea', '#764ba2'],
  direction: 'to right'
};

// Стандартные настройки фона для кнопки сброса
export const standardBackgroundSettings = {
  backgroundType: 'image' as BackgroundType, // Фон по умолчанию - изображение
  solidBackground: {
    color: '#FFFFFF' // Белый цвет (на случай если нет изображений)
  } as SolidBackground,
  gradientBackground: {
    type: 'linear' as const,
    colors: ['#000000', '#FFFFFF'], // Черный и белый
    direction: 'to bottom' // Направление вниз
  } as GradientBackground,
  filters: {
    blur: 0,
    brightness: 100, // Яркость 100% для естественного отображения
    contrast: 100,
    saturate: 100,
    hueRotate: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
    opacity: 100
  } as BackgroundFilters, // Стандартные фильтры
  images: [] as BackgroundImage[], // Галерея пустая
  currentBackground: null as string | null,
  parallaxEnabled: false,
  shadowOverlay: {
    enabled: false,
    intensity: 0,
    height: 0
  },
  autoSwitch: {
    enabled: true, // Включено по умолчанию
    mode: 'daily' as AutoSwitchMode // Переключение раз в день
  }
};

function getImagesFromStorage(): BackgroundImage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getFiltersFromStorage(): BackgroundFilters {
  try {
    const stored = localStorage.getItem(FILTERS_KEY);
    return stored ? JSON.parse(stored) : defaultFilters;
  } catch {
    return defaultFilters;
  }
}

function saveFiltersToStorage(filters: BackgroundFilters): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getBackgroundTypeFromStorage(): BackgroundType {
  try {
    const stored = localStorage.getItem(BG_TYPE_KEY);
    return stored ? (stored as BackgroundType) : 'image';
  } catch {
    return 'image';
  }
}

function saveBackgroundTypeToStorage(type: BackgroundType): void {
  try {
    localStorage.setItem(BG_TYPE_KEY, type);
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getSolidBackgroundFromStorage(): SolidBackground {
  try {
    const stored = localStorage.getItem(SOLID_BG_KEY);
    return stored ? JSON.parse(stored) : defaultSolidBackground;
  } catch {
    return defaultSolidBackground;
  }
}

function saveSolidBackgroundToStorage(solid: SolidBackground): void {
  try {
    localStorage.setItem(SOLID_BG_KEY, JSON.stringify(solid));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getGradientBackgroundFromStorage(): GradientBackground {
  try {
    const stored = localStorage.getItem(GRADIENT_BG_KEY);
    return stored ? JSON.parse(stored) : defaultGradientBackground;
  } catch {
    return defaultGradientBackground;
  }
}

function saveGradientBackgroundToStorage(gradient: GradientBackground): void {
  try {
    localStorage.setItem(GRADIENT_BG_KEY, JSON.stringify(gradient));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getParallaxFromStorage(): boolean {
  try {
    const stored = localStorage.getItem(PARALLAX_KEY);
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
}

function saveParallaxToStorage(enabled: boolean): void {
  try {
    localStorage.setItem(PARALLAX_KEY, JSON.stringify(enabled));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getShadowOverlayFromStorage() {
  try {
    const stored = localStorage.getItem(SHADOW_OVERLAY_KEY);
    return stored ? JSON.parse(stored) : {
      enabled: false,
      intensity: 50,
      height: 60
    };
  } catch {
    return {
      enabled: false,
      intensity: 50,
      height: 60
    };
  }
}

function saveShadowOverlayToStorage(shadowOverlay: { enabled: boolean; intensity: number; height: number }): void {
  try {
    localStorage.setItem(SHADOW_OVERLAY_KEY, JSON.stringify(shadowOverlay));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getAutoSwitchFromStorage() {
  try {
    const stored = localStorage.getItem(AUTO_SWITCH_KEY);
    return stored ? JSON.parse(stored) : { enabled: true, mode: 'daily' as AutoSwitchMode };
  } catch {
    return { enabled: true, mode: 'daily' as AutoSwitchMode };
  }
}

function saveAutoSwitchToStorage(autoSwitch: { enabled: boolean; mode: AutoSwitchMode; lastSwitchDate?: string }): void {
  try {
    localStorage.setItem(AUTO_SWITCH_KEY, JSON.stringify(autoSwitch));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function getBorderlessBackgroundFromStorage(): boolean {
  try {
    const stored = localStorage.getItem(BORDERLESS_BACKGROUND_KEY);
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
}

function saveBorderlessBackgroundToStorage(enabled: boolean): void {
  try {
    localStorage.setItem(BORDERLESS_BACKGROUND_KEY, JSON.stringify(enabled));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

function saveImagesToStorage(images: BackgroundImage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch (error) {
    console.error('Failed to save images to localStorage:', error);
  }
}

function getCurrentBackgroundFromStorage(): string | null {
  try {
    return localStorage.getItem(CURRENT_BG_KEY);
  } catch {
    return null;
  }
}

function saveCurrentBackgroundToStorage(url: string | null): void {
  try {
    if (url) {
      localStorage.setItem(CURRENT_BG_KEY, url);
    } else {
      localStorage.removeItem(CURRENT_BG_KEY);
    }
  } catch (error) {
    console.error('Failed to save current background to localStorage:', error);
  }
}

const initialState: BackgroundState = {
  images: getImagesFromStorage(),
  currentBackground: getCurrentBackgroundFromStorage(),
  isLoading: false,
  filters: getFiltersFromStorage(),
  backgroundType: getBackgroundTypeFromStorage(),
  solidBackground: getSolidBackgroundFromStorage(),
  gradientBackground: getGradientBackgroundFromStorage(),
  parallaxEnabled: getParallaxFromStorage(),
  shadowOverlay: getShadowOverlayFromStorage(),
  autoSwitch: getAutoSwitchFromStorage(),
  borderlessBackground: getBorderlessBackgroundFromStorage()
};

const backgroundSlice = createSlice({
  name: "background",
  initialState,
  reducers: {
    addImage: (state, action: PayloadAction<BackgroundImage>) => {
      console.log("Redux: Adding image", action.payload);
      // Проверяем, что изображение с таким ID еще не добавлено
      const exists = state.images.some(img => img.id === action.payload.id);
      if (!exists) {
        state.images.unshift(action.payload); // Добавляем в начало массива
        saveImagesToStorage(state.images);

        // Автоматически устанавливаем новое изображение как текущий фон
        state.currentBackground = action.payload.id;
        saveCurrentBackgroundToStorage(action.payload.id);

        // Сбрасываем дату последнего переключения для автопроигрывания
        // чтобы очередь начиналась с нового изображения
        if (state.autoSwitch.enabled && state.autoSwitch.mode === 'daily') {
          state.autoSwitch.lastSwitchDate = new Date().toDateString();
          saveAutoSwitchToStorage(state.autoSwitch);
        }

        console.log("Redux: Image added and set as current background, total images:", state.images.length);
      } else {
        console.log("Redux: Image with this ID already exists");
      }
    },
    removeImage: (state, action: PayloadAction<string>) => {
      // Находим удаляемое изображение до фильтрации
      const removedImage = state.images.find(img => img.id === action.payload);
      const removedImageIndex = state.images.findIndex(img => img.id === action.payload);

      // Удаляем изображение
      state.images = state.images.filter(img => img.id !== action.payload);
      saveImagesToStorage(state.images);

      // Если удаляемое изображение было текущим фоном
      if (removedImage && state.currentBackground === removedImage.id) {
        if (state.images.length > 0) {
          // Выбираем следующее изображение
          // Если удалили последнее, берем предыдущее, иначе берем то что на том же индексе
          const nextIndex = removedImageIndex >= state.images.length
            ? state.images.length - 1
            : removedImageIndex;

          state.currentBackground = state.images[nextIndex].id;
          saveCurrentBackgroundToStorage(state.images[nextIndex].id);
        } else {
          // Если изображений не осталось, сбрасываем фон
          state.currentBackground = null;
          saveCurrentBackgroundToStorage(null);
        }
      }
    },
    setCurrentBackground: (state, action: PayloadAction<string | null>) => {
      state.currentBackground = action.payload;
      saveCurrentBackgroundToStorage(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearAllImages: (state) => {
      state.images = [];
      state.currentBackground = null;
      saveImagesToStorage([]);
      saveCurrentBackgroundToStorage(null);
    },
    setFilter: (state, action: PayloadAction<{ key: keyof BackgroundFilters; value: number }>) => {
      state.filters[action.payload.key] = action.payload.value;
      saveFiltersToStorage(state.filters);
    },
    resetFilters: (state) => {
      state.filters = { ...defaultFilters };
      saveFiltersToStorage(state.filters);
    },
    setBackgroundType: (state, action: PayloadAction<BackgroundType>) => {
      state.backgroundType = action.payload;
      saveBackgroundTypeToStorage(action.payload);
    },
    setSolidBackground: (state, action: PayloadAction<SolidBackground>) => {
      state.solidBackground = action.payload;
      saveSolidBackgroundToStorage(action.payload);
    },
    setGradientBackground: (state, action: PayloadAction<GradientBackground>) => {
      state.gradientBackground = action.payload;
      saveGradientBackgroundToStorage(action.payload);
    },
    setCustomGradientCSS: (state, action: PayloadAction<string>) => {
      state.gradientBackground.customCSS = action.payload;
      saveGradientBackgroundToStorage(state.gradientBackground);
    },
    setParallaxEnabled: (state, action: PayloadAction<boolean>) => {
      state.parallaxEnabled = action.payload;
      saveParallaxToStorage(action.payload);
    },
    setShadowOverlayEnabled: (state, action: PayloadAction<boolean>) => {
      state.shadowOverlay.enabled = action.payload;
      saveShadowOverlayToStorage(state.shadowOverlay);
    },
    setShadowOverlayIntensity: (state, action: PayloadAction<number>) => {
      state.shadowOverlay.intensity = action.payload;
      saveShadowOverlayToStorage(state.shadowOverlay);
    },
    setShadowOverlayHeight: (state, action: PayloadAction<number>) => {
      state.shadowOverlay.height = action.payload;
      saveShadowOverlayToStorage(state.shadowOverlay);
    },
    setAutoSwitchEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoSwitch.enabled = action.payload;
      saveAutoSwitchToStorage(state.autoSwitch);
    },
    setAutoSwitchMode: (state, action: PayloadAction<AutoSwitchMode>) => {
      state.autoSwitch.mode = action.payload;
      saveAutoSwitchToStorage(state.autoSwitch);
    },
    setAutoSwitchLastDate: (state, action: PayloadAction<string>) => {
      state.autoSwitch.lastSwitchDate = action.payload;
      saveAutoSwitchToStorage(state.autoSwitch);
    },
    switchToRandomImage: (state) => {
      if (state.images.length > 1) {
        // Находим случайное изображение, отличное от текущего
        const availableImages = state.images.filter(img => img.id !== state.currentBackground);
        if (availableImages.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableImages.length);
          const randomImage = availableImages[randomIndex];
          state.currentBackground = randomImage.id;
          saveCurrentBackgroundToStorage(randomImage.id);
        }
      }
    },
    resetAutoSwitchQueue: (state) => {
      // Сбрасываем очередь автопроигрывания
      if (state.autoSwitch.mode === 'daily') {
        state.autoSwitch.lastSwitchDate = new Date().toDateString();
        saveAutoSwitchToStorage(state.autoSwitch);
      }
    },
    // Применение фона из пресета
    applyPresetBackground: (state, action: PayloadAction<{
      type: 'image' | 'solid' | 'gradient';
      value: string;
      filters?: any;
      images?: any[];
      parallaxEnabled?: boolean;
      shadowOverlay?: any;
      autoSwitch?: any;
    }>) => {
      const { type, value, filters, shadowOverlay, autoSwitch } = action.payload;

      state.backgroundType = type;

      switch (type) {
        case 'image':
          state.currentBackground = value;
          saveCurrentBackgroundToStorage(value);
          break;
        case 'solid':
          state.solidBackground.color = value;
          saveSolidBackgroundToStorage(state.solidBackground);
          break;
        case 'gradient':
          // Для градиентов value содержит CSS градиент
          // Простая реализация - сохраняем как есть
          state.gradientBackground = {
            type: 'linear',
            colors: [value], // Упрощенно
            direction: 'to right'
          };
          saveGradientBackgroundToStorage(state.gradientBackground);
          break;
      }

      // Применяем фильтры
      if (filters) {
        state.filters = { ...filters };
        saveFiltersToStorage(state.filters);
      }

      // Не применяем галерею изображений и параллакс из пресетов
      // if (images) {
      //   state.images = [...images];
      //   saveImagesToStorage(state.images);
      // }

      // if (parallaxEnabled !== undefined) {
      //   state.parallaxEnabled = parallaxEnabled;
      //   saveParallaxToStorage(state.parallaxEnabled);
      // }

      // Применяем настройки затенения
      if (shadowOverlay) {
        state.shadowOverlay = { ...shadowOverlay };
        saveShadowOverlayToStorage(state.shadowOverlay);
      }

      // Применяем настройки автопереключения
      if (autoSwitch) {
        state.autoSwitch = { ...autoSwitch };
        saveAutoSwitchToStorage(state.autoSwitch);
      }

      saveBackgroundTypeToStorage(state.backgroundType);
    },
    // Сброс к стандартным настройкам фона
    resetToStandardBackground: (state) => {
      state.borderlessBackground = false;
      state.backgroundType = standardBackgroundSettings.backgroundType;
      state.solidBackground = { ...standardBackgroundSettings.solidBackground };
      state.gradientBackground = { ...standardBackgroundSettings.gradientBackground };
      state.filters = { ...standardBackgroundSettings.filters };
      state.images = [];
      state.currentBackground = null;
      state.parallaxEnabled = standardBackgroundSettings.parallaxEnabled;
      state.shadowOverlay = { ...standardBackgroundSettings.shadowOverlay };
      state.autoSwitch = { ...standardBackgroundSettings.autoSwitch };

      // Сохраняем все настройки
      saveImagesToStorage([]);
      saveCurrentBackgroundToStorage(null);
      saveFiltersToStorage(state.filters);
      saveBackgroundTypeToStorage(state.backgroundType);
      saveSolidBackgroundToStorage(state.solidBackground);
      saveGradientBackgroundToStorage(state.gradientBackground);
      saveParallaxToStorage(state.parallaxEnabled);
      saveShadowOverlayToStorage(state.shadowOverlay);
      saveAutoSwitchToStorage(state.autoSwitch);
      saveBorderlessBackgroundToStorage(state.borderlessBackground);
    },
    setBorderlessBackground: (state, action: PayloadAction<boolean>) => {
      state.borderlessBackground = action.payload;
      saveBorderlessBackgroundToStorage(action.payload);
    },
  },
});

export const {
  addImage,
  removeImage,
  setCurrentBackground,
  setLoading,
  clearAllImages,
  setFilter,
  resetFilters,
  setBackgroundType,
  setSolidBackground,
  setGradientBackground,
  setCustomGradientCSS,
  setParallaxEnabled,
  setShadowOverlayEnabled,
  setShadowOverlayIntensity,
  setShadowOverlayHeight,
  setAutoSwitchEnabled,
  setAutoSwitchMode,
  setAutoSwitchLastDate,
  switchToRandomImage,
  resetAutoSwitchQueue,
  applyPresetBackground,
  resetToStandardBackground,
  setBorderlessBackground
} = backgroundSlice.actions;

export default backgroundSlice.reducer;
