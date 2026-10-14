import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className={`${sizes[size]} text-brand-500 animate-spin`} />
      {text && <p className="text-sm text-surface-500 dark:text-surface-400">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}
