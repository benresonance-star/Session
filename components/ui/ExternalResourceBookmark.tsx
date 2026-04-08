import Image from 'next/image';
import { ExternalResourceLink } from '@/components/ui/ExternalResourceLink';
import {
  externalLinkDisplayLabel,
  fetchExternalBookmarkPreview,
  normalizeExternalUrl
} from '@/lib/external-resource-link';
import type { ExerciseLink } from '@/types/session';

export async function ExternalResourceBookmark({
  link,
  className
}: {
  link: ExerciseLink;
  className?: string;
}): Promise<JSX.Element | null> {
  const preview = await fetchExternalBookmarkPreview(link);
  const href = normalizeExternalUrl(link.url);

  if (!preview || !href) {
    return (
      <ExternalResourceLink
        link={link}
        className={className}
      />
    );
  }

  return (
    <a
      href={preview.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`skin-panel group block rounded-[var(--radius-panel)] border border-border/80 bg-[var(--panel-bg)] p-4 transition-colors hover:border-text/25 ${className ?? ''}`.trim()}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="skin-label text-[11px] text-muted">{preview.providerLabel}</div>
          <div className="mt-3 text-xl leading-snug text-text group-hover:text-next">
            {preview.title}
          </div>
          {preview.subtitle ? (
            <p className="mt-2 text-sm text-muted">{preview.subtitle}</p>
          ) : null}
          <p className="mt-4 break-all text-sm text-muted">
            {link.label?.trim() ? externalLinkDisplayLabel({ ...link, label: undefined }, href) : preview.hostname}
          </p>
        </div>
        {preview.thumbnailUrl ? (
          <div className="overflow-hidden rounded-[calc(var(--radius-panel)-0.25rem)] border border-border/70 sm:w-56">
            <Image
              src={preview.thumbnailUrl}
              alt={preview.title}
              width={480}
              height={360}
              className="h-40 w-full bg-black object-cover sm:h-full"
            />
          </div>
        ) : null}
      </div>
    </a>
  );
}
