'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Link destination when clicked */
  href?: string;
  /** Show wordmark text alongside icon */
  showWordmark?: boolean;
  /** Show tagline below wordmark */
  showTagline?: boolean;
  /** Tagline text */
  tagline?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className for wrapper */
  className?: string;
  /** Dark mode - use white wordmark */
  darkMode?: boolean;
}

/**
 * HowWePlan Logo Component
 * 
 * A reusable logo component featuring the compass symbol with sun/cloud
 * and optional wordmark. Follows brand guidelines for colors and sizing.
 */
export function Logo({
  href = '/',
  showWordmark = true,
  showTagline = false,
  tagline = 'Travel, simplified',
  size = 'md',
  className,
  darkMode = false,
}: LogoProps) {
  // Size configurations (height in px)
  const sizeConfig = {
    sm: { height: 32, wordmarkSize: 'text-lg', taglineSize: 'text-[10px]' },
    md: { height: 40, wordmarkSize: 'text-xl', taglineSize: 'text-xs' },
    lg: { height: 44, wordmarkSize: 'text-2xl', taglineSize: 'text-xs' },
  };

  const config = sizeConfig[size];
  
  // Calculate width based on aspect ratio (520:120 = 4.33:1 for full logo)
  // Icon alone is 120:120 = 1:1
  const iconAspectRatio = 1;
  const iconWidth = config.height * iconAspectRatio;

  const LogoSvg = (
    <svg
      width={iconWidth}
      height={config.height}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="HowWePlan home"
      className="flex-shrink-0"
    >
      <defs>
        {/* Sky gradient */}
        <linearGradient id="logo-blueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F74A6" />
          <stop offset="100%" stopColor="#123B57" />
        </linearGradient>

        {/* Sun gradient */}
        <radialGradient id="logo-sunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF1B8" />
          <stop offset="100%" stopColor="#F2C14E" />
        </radialGradient>

        {/* Cloud gradient */}
        <linearGradient id="logo-cloudGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EAF3FB" />
        </linearGradient>

        {/* Gold gradient */}
        <linearGradient id="logo-goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4DB94" />
          <stop offset="100%" stopColor="#C8A14A" />
        </linearGradient>
      </defs>

      {/* Compass Ring */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="url(#logo-goldGrad)" strokeWidth="4" />

      {/* Compass Points */}
      <g fill="url(#logo-goldGrad)">
        <polygon points="60,6 67,30 60,26 53,30" />
        <polygon points="60,114 53,90 60,94 67,90" />
        <polygon points="6,60 30,53 26,60 30,67" />
        <polygon points="114,60 90,67 94,60 90,53" />
      </g>

      {/* Inner Sky */}
      <circle cx="60" cy="60" r="34" fill="url(#logo-blueGrad)" />

      {/* Sun */}
      <circle cx="60" cy="52" r="11" fill="url(#logo-sunGrad)" />

      {/* Expanded Sun Rays (still subtle) */}
      <g stroke="#FFF1B8" strokeWidth="2" strokeLinecap="round" opacity="0.75">
        {/* vertical */}
        <line x1="60" y1="37" x2="60" y2="34" />
        <line x1="60" y1="67" x2="60" y2="70" />
        {/* diagonals */}
        <line x1="49" y1="40" x2="47" y2="38" />
        <line x1="71" y1="40" x2="73" y2="38" />
        <line x1="49" y1="64" x2="47" y2="66" />
        <line x1="71" y1="64" x2="73" y2="66" />
        {/* horizontals (very short) */}
        <line x1="44" y1="52" x2="41" y2="52" />
        <line x1="76" y1="52" x2="79" y2="52" />
      </g>

      {/* Cloud */}
      <path
        d="M46 64
           C44 60, 48 56, 52 56
           C54 52, 59 50, 64 51
           C68 49, 73 51, 73 55
           C78 55, 80 59, 80 62
           C80 66, 77 68, 74 68
           L48 68
           C45 68, 42 66, 42 63
           C42 61, 44 64, 46 64
           Z"
        fill="url(#logo-cloudGrad)"
      />

      {/* Large Gold Compass Pointer */}
      <g transform="rotate(-35 60 60)">
        <polygon points="60,32 66,60 60,54 54,60" fill="url(#logo-goldGrad)" />
        <polygon points="60,88 54,60 60,66 66,60" fill="url(#logo-goldGrad)" opacity="0.85" />
      </g>
    </svg>
  );

  const content = (
    <div className={cn('flex items-center gap-2.5 group', className)}>
      <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
        {LogoSvg}
      </div>
      {showWordmark && (
        <div className="hidden sm:block">
          <span
            className={cn(
              'font-semibold tracking-tight block leading-tight',
              config.wordmarkSize,
              darkMode ? 'text-white' : 'text-[#1E4E79]'
            )}
            style={{ fontFamily: 'Poppins, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            HowWePlan
          </span>
          {showTagline && (
            <p className={cn(
              '-mt-0.5',
              config.taglineSize,
              darkMode ? 'text-gray-300' : 'text-gray-400'
            )}>
              {tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
