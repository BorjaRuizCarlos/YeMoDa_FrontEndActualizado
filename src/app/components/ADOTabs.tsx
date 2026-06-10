import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface ADOTab {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface ADOTabsProps {
  tabs: ADOTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  rightSlot?: ReactNode;
}

export function ADOTabs({ tabs, activeTab, onTabChange, className = '', rightSlot }: ADOTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [tabs]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollRef}
        className="flex items-end gap-0 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Project navigation tabs"
      >
        <div className="flex items-end gap-0 shrink-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors
                  ${isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count != null && (
                  <span className={`
                    inline-flex items-center justify-center min-w-[18px] h-[16px] rounded-full px-1 text-[10px] font-semibold
                    ${isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}
                  `}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

        {rightSlot && <div className="ml-auto self-stretch flex shrink-0 px-3">{rightSlot}</div>}
      </div>

      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 inset-y-0 w-8"
          style={{ backgroundImage: 'linear-gradient(to left, transparent, var(--background))' }}
        />
      )}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 inset-y-0 w-8"
          style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--background))' }}
        />
      )}
    </div>
  );
}
