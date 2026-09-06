import Image from 'next/image';
import { BRAND } from '@/lib/brand';

interface BrandLogoProps {
  /** Rendered height in px. Width follows the wordmark's aspect ratio. */
  height?: number;
  className?: string;
  /** Above-the-fold marks (headers) should preload. */
  priority?: boolean;
}

/**
 * The brand wordmark (M4). Source, alt text and aspect ratio all come from
 * BRAND — no literal name or path lives here.
 */
export function BrandLogo({
  height = 28,
  className,
  priority = false,
}: BrandLogoProps) {
  const width = Math.round(height * BRAND.logoAspect);
  return (
    <Image
      src={BRAND.logo}
      alt={BRAND.name}
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ height, width: 'auto' }}
    />
  );
}
