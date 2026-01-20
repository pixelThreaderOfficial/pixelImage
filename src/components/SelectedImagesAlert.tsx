import { useLocation, Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useImages } from "@/context";
import { ImageIcon, Trash2, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SelectedImagesAlertProps {
    className?: string;
}

export function SelectedImagesAlert({ className }: SelectedImagesAlertProps) {
    const location = useLocation();
    const { selectedCount, removeSelectedImages } = useImages();
    const fromUpload = location.state?.fromUpload;

    // Only show if we came from upload and have selected images
    if (!fromUpload || selectedCount === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={className}
            >
                <Alert className="bg-blue-500/5 border-blue-500/20 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div>
                            <AlertTitle className="text-blue-700 font-bold flex items-center gap-2">
                                Context Active
                                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            </AlertTitle>
                            <AlertDescription className="text-blue-600/80">
                                You have <span className="font-bold text-blue-700">{selectedCount} images</span> selected from your uploads. Tools will process these automatically.
                            </AlertDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-blue-200 hover:bg-blue-100 text-blue-700 gap-1.5"
                                onClick={removeSelectedImages}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Clear Context
                            </Button>
                            <Link to="/upload">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 bg-blue-100/50 hover:bg-blue-200/50 text-blue-700 gap-1.5 border-none"
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                    Manage
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Alert>
            </motion.div>
        </AnimatePresence>
    );
}
