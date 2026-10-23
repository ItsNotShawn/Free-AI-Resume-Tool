import { useRoute, Link } from "./router";
import { MemoryProvider, useStore } from "./lib/memory/store";
import { Home } from "./pages/Home";
import { Overview } from "./pages/Overview";
import { Privacy } from "./pages/Privacy";
import { Setup } from "./pages/Setup";
import { AppShell } from "./components/AppShell";

export function App() {
  return (
    <MemoryProvider>
      <Routes />
    </MemoryProvider>
  );
}

function Routes() {
  const route = useRoute();
  const { memory } = useStore();

  if (route === "/") return <Home />;
  if (route === "/privacy") return <Privacy />;

  const needsFile = route === "/memory" || route === "/setup" || route.startsWith("/setup/");
  if (needsFile && !memory) return <NoFile />;
  if (route === "/memory") return <Overview />;
  if (route === "/setup" || route.startsWith("/setup/")) return <Setup step={route.replace(/^\/setup\/?/, "")} />;

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="muted mt-3">There's nothing here.</p>
      <p className="mt-6">
        <Link to="/" className="underline hover:no-underline">
          Back to the start
        </Link>
      </p>
    </AppShell>
  );
}

function NoFile() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">No memory file open</h1>
      <p className="muted mt-3">Start a new memory or open the file you downloaded last time.</p>
      <p className="mt-6">
        <Link to="/" className="btn-primary">
          Go to the start
        </Link>
      </p>
    </AppShell>
  );
}
