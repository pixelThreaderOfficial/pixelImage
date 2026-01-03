import { invoke } from "@tauri-apps/api/core";

export interface UploadRecord {
    id: string;
    file_name: string;
    file_path: string | null;
    file_size: number;
    format: string;
    width: number;
    height: number;
    upload_method: "browse" | "drag_drop";
    uploaded_at: string;
    is_processed: boolean;
}

export const UploadsApi = {
    /**
     * Save an upload record to the database
     */
    async saveUploadRecord(record: UploadRecord): Promise<void> {
        await invoke("save_upload_record", { record });
    },

    /**
     * Mark an upload as processed
     */
    async markAsProcessed(id: string): Promise<void> {
        await invoke("mark_upload_processed", { id });
    },

    /**
     * Get all upload records
     */
    async getAllRecords(): Promise<UploadRecord[]> {
        return await invoke("get_all_upload_records");
    },

    /**
     * Delete an upload record
     */
    async deleteRecord(id: string): Promise<void> {
        await invoke("delete_upload_record", { id });
    },
};
