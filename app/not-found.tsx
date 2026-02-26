import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-4xl font-bold text-slate-900 mb-4">404 - Page Not Found</h2>
      <p className="text-slate-600 mb-8">The page you are looking for does not exist or has been moved.</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
