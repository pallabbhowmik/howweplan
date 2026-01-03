import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ExplorePage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
        <p className="text-muted-foreground mt-2">
          Destination exploration is coming soon. For now, you can create a trip request and let agents propose options.
        </p>

        <Card className="mt-6">
          <CardContent className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">Ready to plan?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tell us your dates, budget, and preferences — we’ll match you with experts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/requests/new">Create a trip request</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
