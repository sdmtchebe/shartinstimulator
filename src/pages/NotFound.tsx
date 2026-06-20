import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-foreground flex-col gap-6">
      <h1 className="pixel-text text-3xl">404 — whoops, Martin got lost</h1>
      <p className="pixel-text text-sm text-muted-foreground">This street doesn't exist. Probably eaten.</p>
      <Link to="/" className="pixel-text bg-primary text-primary-foreground px-4 py-2 rounded">
        Go Home
      </Link>
    </div>
  );
}
