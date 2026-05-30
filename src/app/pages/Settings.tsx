import { useState, useEffect } from 'react';
import { Bell, Lock, Database, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { CommandBar } from '../components/CommandBar';

interface ToggleItem {
  label: string;
  description?: string;
  enabled: boolean;
}

function ToggleRow({ item, onChange }: { item: ToggleItem; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!item.enabled)}
      className="flex items-center justify-between w-full py-2.5 px-3 -mx-3 rounded-[3px] hover:bg-accent/30 transition-colors border-b border-border last:border-0 cursor-pointer"
    >
      <div className="text-left">
        <p className="text-[12px] text-foreground">{item.label}</p>
        {item.description && <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>}
      </div>
      <div
        role="switch"
        aria-checked={item.enabled}
        className={`relative w-9 h-5 rounded-full transition-colors shadow-inner shrink-0 ml-4 ${item.enabled ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow transition-all ${item.enabled ? 'left-4.5' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-border">
      <div className="w-6 h-6 bg-primary/10 rounded-[3px] flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const [notifToggles, setNotifToggles] = useState<ToggleItem[]>(() => {
    try {
      const saved = localStorage.getItem('pip_settings');
      if (saved) return JSON.parse(saved).notifToggles;
    } catch { /* ignore */ }
    return [
      { label: 'At-risk project alerts', description: 'Notify when a project changes to at-risk status', enabled: true },
      { label: 'Daily email summary', description: 'Daily report at 8:00 AM', enabled: true },
      { label: 'Comment notifications', description: 'When someone comments on your projects', enabled: false },
      { label: 'Deadline reminders', description: '3 days before the deadline', enabled: true },
    ];
  });

  const [emailToggles, setEmailToggles] = useState<ToggleItem[]>(() => {
    try {
      const saved = localStorage.getItem('pip_settings');
      if (saved) return JSON.parse(saved).emailToggles;
    } catch { /* ignore */ }
    return [
      { label: 'Newsletters and updates', enabled: true },
      { label: 'Tips and best practices', enabled: false },
      { label: 'Webinar invitations', enabled: false },
    ];
  });

  const [testEmail, setTestEmail] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  const updateNotif = (i: number, v: boolean) =>
    setNotifToggles(prev => prev.map((t, idx) => idx === i ? { ...t, enabled: v } : t));

  const updateEmail = (i: number, v: boolean) =>
    setEmailToggles(prev => prev.map((t, idx) => idx === i ? { ...t, enabled: v } : t));

  const handleSendTest = () => {
    if (!testEmail) { toast.error('Enter an email address'); return; }
    toast.success('Test email sent', { description: `Email sent to ${testEmail}` });
  };

  return (
    <div className="px-4 pb-6 pt-3 space-y-3 max-w-[1600px]">
      <CommandBar
        actions={[
          {
            label: saved ? 'Saved ✓' : 'Save changes',
            variant: 'primary',
            onClick: () => {
              localStorage.setItem('pip_settings', JSON.stringify({ notifToggles, emailToggles }));
              setSaved(true);
              toast.success('Settings saved');
            },
          },
        ]}
      />

      <div className="grid gap-3">
        {/* Notifications (HU-14) */}
        <div className="bg-card border border-border rounded-[4px] p-4">
          <SectionHeader
            icon={<Bell className="w-3.5 h-3.5" />}
            title="Notifications"
            description="Configure how to receive system alerts"
          />
          {notifToggles.map((item, i) => (
            <ToggleRow key={i} item={item} onChange={(v) => updateNotif(i, v)} />
          ))}
        </div>

        {/* Email notifications with test (HU-14) */}
        <div className="bg-card border border-border rounded-[4px] p-4">
          <SectionHeader
            icon={<Mail className="w-3.5 h-3.5" />}
            title="Email notifications"
            description="Email communications"
          />
          {emailToggles.map((item, i) => (
            <ToggleRow key={i} item={item} onChange={(v) => updateEmail(i, v)} />
          ))}

          <div className="mt-3 pt-2.5 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2">Send test email</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <button
                onClick={handleSendTest}
                className="h-7 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3 h-3" />
                Send test
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Endpoint: <code className="text-muted-foreground font-mono">POST /api/notifications/test-email</code>
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card border border-border rounded-[4px] p-4">
          <SectionHeader
            icon={<Lock className="w-3.5 h-3.5" />}
            title="Security"
            description="Passwords and authentication"
          />
          <div className="space-y-1">
            {[
              { title: 'Change password', desc: 'Last updated: 45 days ago' },
              { title: 'Two-factor authentication', desc: 'Not configured' },
              { title: 'Active sessions', desc: 'View and manage devices' },
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => toast.info(item.title)}
                className="w-full text-left py-2 px-3 border border-border rounded-[4px] hover:border-primary/40 hover:bg-accent/30 transition-colors"
              >
                <p className="text-[12px] font-medium text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-card border border-border rounded-[4px] p-4">
          <SectionHeader
            icon={<Database className="w-3.5 h-3.5" />}
            title="Data"
            description="Export and import data"
          />
          <div className="space-y-1">
            <button
              onClick={() => toast.success('Export started', { description: 'Downloading data in JSON' })}
              className="w-full text-left py-2 px-3 border border-border rounded-[4px] hover:border-primary/40 transition-colors"
            >
              <p className="text-[12px] font-medium text-foreground">Export data</p>
              <p className="text-[10px] text-muted-foreground">Full JSON download</p>
            </button>
            <button
              onClick={() => toast.info('Select a CSV or Excel file')}
              className="w-full text-left py-2 px-3 border border-border rounded-[4px] hover:border-primary/40 transition-colors"
            >
              <p className="text-[12px] font-medium text-foreground">Import projects</p>
              <p className="text-[10px] text-muted-foreground">From CSV or Excel</p>
            </button>
            <button
              onClick={() => toast.error('Action not available in demo mode')}
              className="w-full text-left py-2 px-3 bg-destructive/5 border border-destructive/20 rounded-[4px] hover:bg-destructive/10 transition-colors"
            >
              <p className="text-[12px] font-medium text-destructive">Delete all data</p>
              <p className="text-[10px] text-destructive/70">Irreversible action</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
