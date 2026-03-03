import { useEffect } from "react";

// The Vyoma Dispatch Tool runs as standalone static HTML/JS/CSS files.
// This React entry point simply redirects to the login page.
export default function App() {
  useEffect(() => {
    window.location.replace("/dispatch-login.html");
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0d1657",
        color: "#f9a825",
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "1rem",
      }}
    >
      Loading Vyoma Dispatch Tool…
    </div>
  );
}
