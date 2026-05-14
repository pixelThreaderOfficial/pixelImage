import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { TooltipProvider } from "@/components/ui/tooltip"
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <TooltipProvider>
            <App />
        </TooltipProvider>
    </React.StrictMode>
);
