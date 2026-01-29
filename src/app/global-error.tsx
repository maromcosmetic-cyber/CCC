'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <p className="text-muted-foreground">{error.message || 'An unexpected error occurred'}</p>
          <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
