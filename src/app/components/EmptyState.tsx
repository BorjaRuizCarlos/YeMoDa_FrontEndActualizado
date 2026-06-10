import { Search, Inbox, FileX } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon?: 'search' | 'inbox' | 'file';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  search: Search,
  inbox: Inbox,
  file: FileX,
};

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border text-muted-foreground mb-4">
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <h3 className="text-[13px] font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-[12px] text-muted-foreground text-center max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-[6px] transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
