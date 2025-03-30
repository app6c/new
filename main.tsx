import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadStripeScript } from "./lib/stripe";

// Pre-load Stripe script to avoid initial loading delay on checkout
loadStripeScript();

createRoot(document.getElementById("root")!).render(<App />);
