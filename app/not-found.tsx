// app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { SearchX } from 'lucide-react'; // A fitting icon for "not found"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <SearchX className="h-10 w-10 text-red-600" strokeWidth={1.5} />
        </div>

        {/* Text Content */}
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Sorry, we couldn’t find the page you’re looking for. It might have been moved or deleted.
        </p>

        {/* Action Button */}
        <div className="mt-10">
          <Link href="/">
            <Button size="lg">
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}