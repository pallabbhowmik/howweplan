'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useUserSession } from '@/lib/user/session';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function SiteNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUserSession();
  const isAuthenticated = !!user && !loading;

  const logoHref = isAuthenticated ? '/dashboard' : '/';

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Logo href={logoHref} showWordmark size="md" />
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:inline-flex">
                    Discover
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/explore" className="w-full cursor-pointer">
                      Explore Destinations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/compare-agents" className="w-full cursor-pointer">
                      Compare Advisors
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/group-trip" className="w-full cursor-pointer">
                      Group Trip Planning
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/trip-countdown" className="w-full cursor-pointer">
                      Trip Countdown
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/requests/new">
                <Button>Plan Trip</Button>
              </Link>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:inline-flex">
                    Discover
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/explore" className="w-full cursor-pointer">
                      Explore Destinations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/compare-agents" className="w-full cursor-pointer">
                      Compare Advisors
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/how-it-works" className="w-full cursor-pointer">
                      How It Works
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/requests/new">
                <Button>Start Planning</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
