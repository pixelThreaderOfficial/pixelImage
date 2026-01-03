import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: string;
    storageKey?: string;
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "pixelimage-theme",
    ...props
}: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme={defaultTheme}
            storageKey={storageKey}
            enableSystem
            disableTransitionOnChange
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
