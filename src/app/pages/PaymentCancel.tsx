import { Link } from 'react-router';
import { XCircle, Crown } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="px-4 pb-6 pt-3 max-w-[980px]">
      <h1 className="text-[13px] font-semibold text-foreground mb-0.5">Payment canceled</h1>
      <p className="text-[11px] text-muted-foreground mb-4">No charge was made</p>

      <div className="bg-card border border-border rounded-[6px] p-5">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 mt-0.5 text-warning" />
          <div className="w-full">
            <p className="text-[13px] font-medium text-foreground">The payment process was canceled.</p>
            <p className="text-[11px] text-muted-foreground mt-1">You can try again anytime from your profile.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/profile"
                className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] text-[11px] font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                Back to profile
              </Link>
              <Link
                to="/dashboard"
                className="h-8 px-3 border border-border hover:bg-accent rounded-[4px] text-[11px] font-medium transition-colors inline-flex items-center"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}