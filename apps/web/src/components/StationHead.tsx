import type { ReactNode } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}

export function StationHead({ eyebrow, title, sub, action }: Props) {
  return (
    <div className="py-4 px-5 pb-2 flex items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {eyebrow && <span className="text-xs text-accent-bright font-medium mb-0.5">{eyebrow}</span>}
        <h1 className="font-display text-[30px] font-semibold m-0 leading-[1.1] text-fg" style={{ letterSpacing: '-0.025em' }}>
          {title}
        </h1>
        {sub && <span className="text-sm text-fg-muted mt-0.5">{sub}</span>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
