'use client';

import Image from 'next/image';
import { useCallback } from 'react';
import youtubeIcon from '@/Reference UI Images/Youtube.png';
import type { ExerciseLink } from '@/types/session';
import {
  externalLinkDisplayLabel,
  normalizeExternalUrl,
  youtubeAppLaunchUrl,
  youtubeVideoIdFromUrl
} from '@/lib/external-resource-link';

/**
 * Opens in a new browser tab by default. On coarse-pointer devices, YouTube URLs
 * also try the native YouTube app scheme first (OS may still open the browser).
 */
export function ExternalResourceLink({
  link,
  className,
  preferYouTubeIcon = false
}: {
  link: ExerciseLink;
  className?: string;
  preferYouTubeIcon?: boolean;
}): JSX.Element | null {
  const href = normalizeExternalUrl(link.url);
  const videoId = href ? youtubeVideoIdFromUrl(href) : null;
  const label = href ? externalLinkDisplayLabel(link, href) : '';

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!href || !videoId || typeof window === 'undefined') {
        return;
      }
      const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
      if (!coarse) {
        return;
      }
      const app = youtubeAppLaunchUrl(videoId);
      if (app) {
        e.preventDefault();
        window.location.assign(app);
      }
    },
    [href, videoId]
  );

  if (!href) {
    return null;
  }

  const showYouTubeIcon = preferYouTubeIcon && Boolean(videoId);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {showYouTubeIcon ? (
        <>
          <Image
            src={youtubeIcon}
            alt=""
            aria-hidden="true"
            className="h-14 w-14 object-contain"
            sizes="56px"
          />
          <span className="sr-only">{link.label?.trim() || 'YouTube'}</span>
        </>
      ) : (
        label
      )}
    </a>
  );
}
