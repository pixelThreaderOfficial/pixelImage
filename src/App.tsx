import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, Layout } from "@/components/layout";
import { ImageProvider } from "@/context";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard, Upload, Tools, BatchProcessor, WebIconsGenerator, Analytics, History, Settings } from "@/pages";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="pixelimage-theme">
      <ImageProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/tools/batch" element={<BatchProcessor />} />
              <Route path="/tools/web-icons" element={<WebIconsGenerator />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
          <Toaster richColors position="bottom-right" />
        </BrowserRouter>
      </ImageProvider>
    </ThemeProvider>
  );
}

export default App;
