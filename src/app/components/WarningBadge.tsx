import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface WarningBadgeProps {
  count: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  showWhenZero?: boolean;
}

export function WarningBadge({
  count,
  className = '',
  onClick,
  disabled = false,
  showWhenZero = false,
}: WarningBadgeProps) {
  if (count === 0 && !showWhenZero) return null;

  const label = `${count}`;
  const badgeClassName = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
    disabled
      ? 'bg-muted/30 text-muted-foreground border-border cursor-not-allowed'
      : 'bg-warning/15 text-warning border-warning/20'
  } ${className}`;

  const badge = onClick || disabled ? (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={badgeClassName}
    >
      <AlertTriangle className="w-3 h-3" />
      {label}
    </button>
  ) : (
    <span className={badgeClassName}>
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {count > 0
          ? `${count} active warning${count !== 1 ? 's' : ''}`
          : 'No active warnings'}
      </TooltipContent>
    </Tooltip>
  );
}
