import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Github, FolderPlus, Users, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsService, githubService } from '../../services';
import { hasSeen, markSeen, WELCOME_ID } from '../utils/onboarding';

interface Step {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

// Linear-style first-run intro. Only shown to brand-new users (no projects yet) who
// haven't completed it. Mounted in AppLayout so it floats over the app and survives
// navigation (so step 3 can route the user to Projects while staying open).
export function OnboardingWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'checking' | 'show' | 'hidden'>('checking');
  const [step, setStep] = useState(0);
  const [ghConnected, setGhConnected] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Decide whether to show: skip if already seen; skip (and remember) for users who
  // already have projects — they're not new. Never block the app on errors.
  useEffect(() => {
    if (!user) return;
    if (hasSeen(user.id, WELCOME_ID)) {
      setPhase('hidden');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const projects = await projectsService.list();
        if (cancelled) return;
        if (projects.length > 0) {
          markSeen(user.id, WELCOME_ID);
          setPhase('hidden');
        } else {
          setPhase('show');
        }
      } catch {
        if (!cancelled) setPhase('hidden');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Reflect current GitHub connection state on the connect step.
  useEffect(() => {
    if (phase !== 'show') return;
    let cancelled = false;
    githubService
      .checkConnectionStatus()
      .then((s) => !cancelled && setGhConnected(Boolean(s?.connected)))
      .catch(() => !cancelled && setGhConnected(false));
    return () => {
      cancelled = true;
    };
  }, [phase]);

  if (phase !== 'show' || !user) return null;

  const firstName = user.name?.split(' ')[0] ?? '';
  const steps: Step[] = [
    {
      icon: Sparkles,
      title: firstName ? `Welcome to Yemoda, ${firstName}` : 'Welcome to Yemoda',
      body: 'Project intelligence for engineering teams — real-time health, early-warning alerts, and AI that reviews code and proposes fixes. Let’s get you set up in under a minute.',
    },
    {
      icon: Github,
      title: 'Connect GitHub',
      body: 'This is where Yemoda shines: it links pushes to tasks, reviews diffs, and proposes AI fixes you can commit. Connect your account to unlock the full workflow.',
    },
    {
      icon: FolderPlus,
      title: 'Create your first project',
      body: 'Projects hold your boards, sprints, timeline, code review and team. Create one to start tracking real work.',
    },
    {
      icon: Users,
      title: 'Invite your team',
      body: 'Yemoda is better together. Open any project’s Team tab to invite teammates and assign a role per project.',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const finish = () => {
    markSeen(user.id, WELCOME_ID);
    setPhase('hidden');
  };

  const connectGitHub = async () => {
    if (ghConnected) {
      setStep(2);
      return;
    }
    // The user is about to leave for GitHub OAuth — mark done so it doesn't reappear
    // when they return, then redirect.
    markSeen(user.id, WELCOME_ID);
    setRedirecting(true);
    try {
      await githubService.startOAuth();
    } catch {
      setRedirecting(false);
    }
  };

  const handlePrimary = () => {
    if (step === 0) setStep(1);
    else if (step === 1) void connectGitHub();
    else if (step === 2) setStep(3);
    else {
      finish();
      navigate('/projects');
    }
  };

  const primaryLabel =
    step === 0
      ? 'Let’s get started'
      : step === 1
        ? ghConnected
          ? 'Connected — continue'
          : 'Connect GitHub'
        : step === 2
          ? 'Next'
          : 'Finish & go to Projects';

  const secondary = step === 1 || step === 2 ? (step === 1 ? 'Skip for now' : 'Later') : null;

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-background/80 px-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[12px] border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={finish}
          aria-label="Skip onboarding"
          className="absolute right-3 top-3 rounded-[4px] p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-[18px] font-semibold text-foreground">{current.title}</h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{current.body}</p>

        {step === 1 && ghConnected && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-[4px] bg-success/10 px-2 py-1 text-[12px] font-medium text-success">
            <Check className="h-3.5 w-3.5" /> GitHub is connected
          </p>
        )}

        {/* Progress dots */}
        <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {secondary && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="h-9 rounded-[6px] border border-border bg-card px-3.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-secondary"
              >
                {secondary}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimary}
              disabled={redirecting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {redirecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting…
                </>
              ) : (
                <>
                  {primaryLabel}
                  {!isLast && step !== 1 && <ArrowRight className="h-3.5 w-3.5" />}
                  {step === 1 && !ghConnected && <Github className="h-3.5 w-3.5" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
