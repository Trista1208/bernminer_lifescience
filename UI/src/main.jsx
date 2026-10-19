import React from "react";
import { createRoot } from "react-dom/client";

// Default: the BearMiner flow (company → score → choices → proposal PDF).
// Add ?classic to the URL for the original analyst view.
const classic = new URLSearchParams(window.location.search).has("classic");

async function boot() {
  const App = classic
    ? (await Promise.all([import("./App.jsx"), import("./styles.css")]))[0].default
    : (await import("./BernApp.jsx")).default;
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

boot();
