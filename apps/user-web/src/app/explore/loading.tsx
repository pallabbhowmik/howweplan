import { Skeleton } from '@/components/ui/skeleton';

export default function ExploreLoading() {
  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero Skeleton */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-8 md:p-12">
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-96" />
          <Skeleton className="h-12 w-full max-w-md rounded-xl mt-4" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Featured Destinations Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <Skeleton className="h-48 w-full" />
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
