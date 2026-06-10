import { Link, useLocation } from 'react-router';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'motion/react';

const MONO = { fontFamily: 'var(--font-mono-lp, monospace)' } as const;

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="border border-border bg-card rounded-[4px]"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={MONO}>
              Signal lost
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={MONO}>
              ERR / ROUTE
            </span>
          </div>

          <div className="px-5 py-6">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-[56px] leading-none font-semibold tabular-nums text-foreground"
              style={MONO}
            >
              404
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h1 className="mt-4 text-[15px] font-semibold text-foreground">This route is out of scope.</h1>
              <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                Nothing is mapped at{' '}
                <code className="border border-border rounded-[3px] px-1 py-0.5 text-[11px] text-foreground break-all" style={MONO}>
                  {location.pathname}
                </code>
                . Check the URL or return to an instrumented section.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center gap-3 border-t border-border px-5 py-4"
          >
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-secondary hover:bg-accent text-foreground rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
