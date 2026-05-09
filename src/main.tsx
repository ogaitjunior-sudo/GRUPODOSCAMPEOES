import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { refreshApplicationCacheForBuild } from "./lib/app-cache";
import "./index.css";

declare const __APP_BUILD_ID__: string;

void refreshApplicationCacheForBuild(__APP_BUILD_ID__);

createRoot(document.getElementById("root")!).render(<App />);
