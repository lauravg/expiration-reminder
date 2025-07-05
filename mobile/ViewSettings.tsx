import { create } from 'zustand';
import Requests from './Requests';

export interface ViewSettings {
  sortByProductList: string;
  hideExpiredProductList: boolean;
  activeFilterProductList: string;
  viewModeProductList: 'grid' | 'list' | 'simple';
  sortByWastedList: string;
  hideExpiredWastedList: boolean;
  activeFilterWastedList: string;
  viewModeWastedList: 'grid' | 'list' | 'simple';
}

export type ViewSettingKey = keyof ViewSettings;

interface ViewSettingsState extends ViewSettings {
  set: <K extends ViewSettingKey>(key: K, value: ViewSettings[K]) => void;
  initialize: () => Promise<void>;
}

const requests = new Requests();

const getDefaultSettings = (): ViewSettings => ({
  sortByProductList: 'name',
  hideExpiredProductList: false,
  activeFilterProductList: 'all',
  viewModeProductList: 'list',
  sortByWastedList: 'name',
  hideExpiredWastedList: false,
  activeFilterWastedList: 'all',
  viewModeWastedList: 'list',
});

export const useViewSettings = create<ViewSettingsState>((set, get) => {
  let cachedSettings: ViewSettings | null = null;

  return {
    ...getDefaultSettings(),

    set: async <K extends ViewSettingKey>(key: K, value: ViewSettings[K]) => {
      const currentSettings = get();
      const newSettings = { ...currentSettings, [key]: value };
      
      // Update local state immediately
      set({ [key]: value } as Pick<ViewSettingsState, K>);
      
      // Only save to server if settings have actually changed
      if (!cachedSettings || JSON.stringify(newSettings) !== JSON.stringify(cachedSettings)) {
        try {
          await requests.saveViewSettings(newSettings);
          cachedSettings = newSettings;
        } catch (error) {
          console.error('Failed to save view settings:', error);
        }
      }
    },

    initialize: async () => {
      try {
        const settings = await requests.getViewSettings();
        if (settings) {
          set(settings);
          cachedSettings = settings;
        } else {
          const defaultSettings = getDefaultSettings();
          set(defaultSettings);
          await requests.saveViewSettings(defaultSettings);
          cachedSettings = defaultSettings;
        }
      } catch (error) {
        console.error('Failed to initialize ViewSettingsManager:', error);
        const defaultSettings = getDefaultSettings();
        set(defaultSettings);
        cachedSettings = defaultSettings;
      }
    },
  };
});

useViewSettings.getState().initialize(); 