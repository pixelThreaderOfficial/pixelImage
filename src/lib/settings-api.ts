import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
    backup_enabled: boolean;
}

export const SettingsApi = {
    getSetting: async (key: string): Promise<string | null> => {
        return await invoke('get_app_setting', { key });
    },

    setSetting: async (key: string, value: string): Promise<void> => {
        return await invoke('set_app_setting', { key, value });
    },

    getBackupEnabled: async (): Promise<boolean> => {
        const val = await invoke<string | null>('get_app_setting', { key: 'backup_enabled' });
        // Default to true if no setting exists (backup enabled by default)
        if (val === null || val === undefined) return true;
        return val === 'true';
    },

    setBackupEnabled: async (enabled: boolean): Promise<void> => {
        return await invoke('set_app_setting', { key: 'backup_enabled', value: enabled ? 'true' : 'false' });
    },

    exportData: async (targetPath: string): Promise<void> => {
        return await invoke('export_data', { targetPath });
    }
};
