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

export const useViewSettings = create<ViewSettingsState>((set, get) => ({
  ...getDefaultSettings(),

  set: async <K extends ViewSettingKey>(key: K, value: ViewSettings[K]) => {
    set({ [key]: value } as Pick<ViewSettingsState, K>);
    await requests.saveViewSettings({ ...get(), [key]: value });
  },

  initialize: async () => {
    try {
      const settings = await requests.getViewSettings();
      if (settings) {
        set(settings);
      } else {
        const defaultSettings = getDefaultSettings();
        set(defaultSettings);
        await requests.saveViewSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to initialize ViewSettingsManager:', error);
      set(getDefaultSettings());
    }
  },
}));

useViewSettings.getState().initialize(); 