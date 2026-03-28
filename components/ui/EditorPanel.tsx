import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

export function EditorPanel({
  title,
  subtitle,
  actions,
  children,
  className = '',
  collapsible = false,
  collapsed = false,
  onToggleCollapse
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}): JSX.Element {
  return (
    <section className={`rounded-xl border border-border/80 bg-panel/50 p-4 sm:p-5 ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-medium text-text">{title}</div>
          {!collapsed && subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
        </div>
        {(actions || collapsible) ? (
          <div className="flex flex-wrap gap-px">
            {collapsible ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md p-0 text-muted transition-colors hover:text-text"
              >
                {collapsed ? (
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </button>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
      {!collapsed ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
