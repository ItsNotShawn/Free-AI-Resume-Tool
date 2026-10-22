import { useRoute, Link } from "./router";
import { Home } from "./pages/Home";

export function App() {
  const route = useRoute();

  if (route === "/") return <Home />;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 sm:px-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        There's nothing at <code>{route}</code>.
      </p>
      <p className="mt-6">
        <Link to="/" className="underline hover:no-underline">
          Back to the start
        </Link>
      </p>
    </main>
  );
}
