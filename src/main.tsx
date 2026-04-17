import "./index.css";

function disableProblematicBrowserAuthLocks() {
  if (typeof window === "undefined") return;

  try {
    if ("locks" in navigator) {
      Object.defineProperty(window.navigator, "locks", {
        configurable: true,
        value: undefined,
      });
    }
  } catch {
    // Ignore browsers that don't allow patching navigator APIs.
  }
}

async function bootstrap() {
  disableProblematicBrowserAuthLocks();

  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  const [{ createRoot }, { default: App }] = await Promise.all([
    import("react-dom/client"),
    import("./App.tsx"),
  ]);

  createRoot(rootElement).render(<App />);
}

bootstrap();
