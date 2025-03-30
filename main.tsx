import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadStripeScript } from "./lib/stripe";
import { registerServiceWorker, checkPwaInstallable } from "./serviceWorkerRegistration";
import "./lib/i18n"; // Importando i18n

// Pre-load Stripe script to avoid initial loading delay on checkout
loadStripeScript();

// Registra o service worker para recursos PWA
registerServiceWorker();

// Verifica se o app pode ser instalado e configura os eventos necessários
checkPwaInstallable();

createRoot(document.getElementById("root")!).render(<App />);
