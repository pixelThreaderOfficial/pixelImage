import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Settings2,
    Download,
    Palette,
    Database,
    AlertTriangle,
    FolderOpen,
    Image as ImageIcon,
    CircleCheck,
    Info,
    Upload,
} from "lucide-react";
import { SettingsApi } from "@/lib/settings-api";
import { useTheme } from "next-themes";
import { useImages } from "@/context";
import { pickFolder } from "@/lib/file-dialog";
// saveFile might not exist in file-dialog, so checking usage. 
// SettingsApi.exportData takes a path. So we need save dialog.
// Assuming pickFolder exists, maybe I need to use tauri dialog directly or add saveFile to file-dialog.
// But wait, in previous steps I decided to pass targetPath to exportData. 
// I'll use save from tauri-plugin-dialog if available in frontend or just implement a specific save helper.
// Actually, let's just use @tauri-apps/plugin-dialog save directly here or rely on what's available.
import { save, open } from '@tauri-apps/plugin-dialog';
import { toast } from "sonner";

export function Settings() {
    const { theme, setTheme } = useTheme();
    const { outputDirectory, setOutputDirectory, settings, updateSettings } = useImages();
    const [mounted, setMounted] = useState(false);
    const [backupEnabled, setBackupEnabled] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showDisableDialog, setShowDisableDialog] = useState(false);
    const [disableConsent, setDisableConsent] = useState(false);

    // load backup setting - default to true if not set
    // load backup setting and theme - default to true if not set
    useEffect(() => {
        SettingsApi.getBackupEnabled().then((enabled) => {
            // If no setting exists, default to true
            setBackupEnabled(enabled ?? true);
        });

        SettingsApi.getSetting("theme").then((savedTheme) => {
            if (savedTheme) {
                setTheme(savedTheme);
            }
        });
    }, [setTheme]);

    const handleBackupToggle = async (checked: boolean) => {
        if (checked) {
            // Enabling backup - just do it with a toast
            setBackupEnabled(true);
            await SettingsApi.setBackupEnabled(true);
            toast.success("Backup enabled - Your data is now being backed up");
        } else {
            // Disabling backup - show warning dialog
            setShowDisableDialog(true);
        }
    };

    const handleConfirmDisable = async () => {
        setBackupEnabled(false);
        await SettingsApi.setBackupEnabled(false);
        setShowDisableDialog(false);
        setDisableConsent(false);
        toast.success("Backup disabled - Your data will no longer be backed up");
    };

    const handleCancelDisable = () => {
        setShowDisableDialog(false);
        setDisableConsent(false);
    };

    const [importing, setImporting] = useState(false);

    const handleExportAllData = async () => {
        try {
            const path = await save({
                filters: [{
                    name: 'Zip Archive',
                    extensions: ['zip']
                }],
                defaultPath: 'pixelimage_backup.zip',
            });

            if (path) {
                setExporting(true);
                toast.loading("Exporting all data...");
                await SettingsApi.exportData(path);
                toast.dismiss();
                toast.success("All data exported successfully!");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("Failed to export data");
        } finally {
            setExporting(false);
        }
    };

    const handleExportAppConfig = async () => {
        try {
            const path = await save({
                filters: [{
                    name: 'JSON Config',
                    extensions: ['json']
                }],
                defaultPath: 'pixelimage_config.json',
            });

            if (path) {
                setExporting(true);
                toast.loading("Exporting app config...");
                await SettingsApi.exportSettingsJson(path);
                toast.dismiss();
                toast.success("App configuration exported!");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("Failed to export config");
        } finally {
            setExporting(false);
        }
    };

    const handleImportAppConfig = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'JSON Config',
                    extensions: ['json']
                }]
            });

            if (selected && typeof selected === 'string') {
                setImporting(true);
                toast.loading("Importing app config...");

                await SettingsApi.importSettingsJson(selected);

                toast.dismiss();
                toast.success("Configuration imported! Restarting...");

                // Reload window to apply settings
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("Failed to import config");
        } finally {
            setImporting(false);
        }
    };

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSelectOutputDir = async () => {
        const folder = await pickFolder();
        if (folder) {
            setOutputDirectory(folder);
            toast.success("Output directory updated");
        }
    };

    const getQualityLabel = (val: number) => {
        if (val >= 90) return "Maximum";
        if (val >= 75) return "High";
        if (val >= 50) return "Medium";
        if (val >= 25) return "Low";
        return "Minimum";
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="space-y-6">


            {/* Appearance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Appearance
                    </CardTitle>
                    <CardDescription>
                        Customize the look and feel of the application
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Theme</Label>
                            <p className="text-sm text-muted-foreground">
                                Select your preferred color scheme
                            </p>
                        </div>
                        <Select value={theme} onValueChange={(val) => {
                            setTheme(val);
                            SettingsApi.setSetting("theme", val);
                            toast.success("Theme saved");
                        }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Output Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Output Settings
                    </CardTitle>
                    <CardDescription>
                        Configure where processed images are saved
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Output Directory</Label>
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                                {outputDirectory || "Not set - will prompt when processing"}
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleSelectOutputDir}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {outputDirectory ? "Change" : "Select"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Default Processing Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Default Processing
                    </CardTitle>
                    <CardDescription>
                        Set default compression and format preferences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Default Format */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Default Output Format</Label>
                            <p className="text-sm text-muted-foreground">
                                Default format for processed images
                            </p>
                        </div>
                        <Select
                            value={settings.outputFormat}
                            onValueChange={(val) =>
                                updateSettings({ outputFormat: val as typeof settings.outputFormat })
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="original">Keep Original</SelectItem>
                                <SelectItem value="jpeg">JPEG</SelectItem>
                                <SelectItem value="png">PNG</SelectItem>
                                <SelectItem value="webp">WebP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Default Quality */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Default Quality</Label>
                                <p className="text-sm text-muted-foreground">
                                    {getQualityLabel(settings.quality)} quality preset
                                </p>
                            </div>
                            <span className="text-2xl font-bold">{settings.quality}%</span>
                        </div>
                        <Slider
                            value={[settings.quality]}
                            onValueChange={([val]) => updateSettings({ quality: val })}
                            max={100}
                            min={1}
                            step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Smaller size</span>
                            <span>Better quality</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Presets */}
                    <div className="space-y-3">
                        <Label className="text-base">Quick Presets</Label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: "Web (80%)", quality: 80, format: "webp" },
                                { label: "Social (85%)", quality: 85, format: "jpeg" },
                                { label: "High (95%)", quality: 95, format: "png" },
                            ].map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant={
                                        settings.quality === preset.quality &&
                                            settings.outputFormat === preset.format
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                        updateSettings({
                                            quality: preset.quality,
                                            outputFormat: preset.format as typeof settings.outputFormat,
                                        })
                                    }
                                >
                                    {settings.quality === preset.quality &&
                                        settings.outputFormat === preset.format ? (
                                        <CircleCheck className="h-4 w-4 mr-1" />
                                    ) : null}
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Advanced
                    </CardTitle>
                    <CardDescription>Additional processing options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Preserve Metadata</Label>
                            <p className="text-sm text-muted-foreground">
                                Keep EXIF data in processed images
                            </p>
                        </div>
                        <Switch
                            checked={settings.preserveMetadata}
                            onCheckedChange={(checked) =>
                                updateSettings({ preserveMetadata: checked })
                            }
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Lossless Compression</Label>
                            <p className="text-sm text-muted-foreground">
                                No quality loss (larger file sizes)
                            </p>
                        </div>
                        <Switch
                            checked={settings.lossless}
                            onCheckedChange={(checked) =>
                                updateSettings({ lossless: checked })
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Data & Backup */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Data & Backup
                    </CardTitle>
                    <CardDescription>
                        Manage application data and backups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Automatic Backup</Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically backup processed images to internal storage (__mocks)
                            </p>
                        </div>
                        <Switch
                            checked={backupEnabled}
                            onCheckedChange={handleBackupToggle}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Export Data</Label>
                            <p className="text-sm text-muted-foreground">
                                Export your data or configuration
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleExportAllData} disabled={exporting}>
                                {exporting ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    <>
                                        <Database className="h-4 w-4 mr-2" />
                                        All Data (ZIP)
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleExportAppConfig} disabled={exporting}>
                                {exporting ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        App Config (JSON)
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Import Config</Label>
                            <p className="text-sm text-muted-foreground">
                                Restore settings from a .json file
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleImportAppConfig} disabled={importing}>
                            {importing ? (
                                <span className="animate-pulse">Importing...</span>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Import Config
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* About */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        About
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-mono">0.1.0</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">Framework</span>
                        <span className="font-mono">Tauri v2</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">UI</span>
                        <span className="font-mono">React + ShadCN</span>
                    </div>
                </CardContent>
            </Card>

            {/* Backup Disable Confirmation Dialog */}
            <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Disable Automatic Backup?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-4">
                            <p className="font-semibold text-foreground">
                                ⚠️ Warning: Disabling backup may result in data loss
                            </p>

                            <div className="space-y-2 text-sm">
                                <p className="font-medium">Without backup, you will lose:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Original images after processing</li>
                                    <li>Ability to restore previous versions</li>
                                    <li>Protection against accidental deletion</li>
                                    <li>Recovery options if processing fails</li>
                                </ul>
                            </div>

                            <div className="bg-muted p-3 rounded-md">
                                <p className="text-sm font-medium">
                                    💡 Recommendation: Keep backup enabled for data safety
                                </p>
                            </div>

                            <div className="flex items-start space-x-2 pt-2">
                                <Checkbox
                                    id="consent"
                                    checked={disableConsent}
                                    onCheckedChange={(checked) => setDisableConsent(checked as boolean)}
                                />
                                <label
                                    htmlFor="consent"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    I understand the risks and want to disable backup
                                </label>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDisable}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDisable}
                            disabled={!disableConsent}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Disable Backup
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
