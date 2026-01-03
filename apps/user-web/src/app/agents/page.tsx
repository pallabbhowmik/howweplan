import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AgentsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground mt-2">
          Agent profiles are being prepared. You’ll see vetted experts once this page is ready.
        </p>

        <Card className="mt-6">
          <CardContent className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">Want proposals now?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create a trip request and agents will respond with personalized itineraries.
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
