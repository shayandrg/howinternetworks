import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-medium">Page not found</h1>
      <p className="text-[var(--color-secondary)]">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="text-[var(--color-accent)] hover:underline">
        Go home
      </Link>
    </div>
  );
}
