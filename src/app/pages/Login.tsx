import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, Lock, Mail, ArrowRight, BarChart3, Bell, Brain, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingButton } from '../components/LoadingButton';
import { toast } from 'sonner';
import { authService, ApiRequestError } from '../../services';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [emailBlocked, setEmailBlocked] = useState(() => searchParams.get('reason') === 'email_blocked');
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();

  // Inverse guard: authenticated users should not see the sign-in page.
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setEmailBlocked(false);
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiRequestError && err.body?.code === 'email_verification_required') {
        setEmailBlocked(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Could not resend. Try again shortly.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    authService.startGoogleLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Dark branding */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-[#010409] flex-col justify-between p-10 border-r border-[#21262D]">
        <div>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-14">
            <div className="w-8 h-8 bg-primary rounded-[3px] flex items-center justify-center">
              <span className="text-white font-bold text-xs">YM</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">Yemoda</p>
              <p className="text-[10px] text-[#8B949E] leading-tight">Project Intelligence Platform</p>
            </div>
          </Link>

          <h2 className="text-[22px] font-bold text-white leading-snug mb-3">
            AI that works<br />
            <span className="text-primary">for your team</span>
          </h2>
          <p className="text-[13px] text-[#8B949E] leading-relaxed mb-10">
            Real-time visibility, early warnings, and smart predictions — without the setup overhead or the black boxes.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: <BarChart3 className="w-3.5 h-3.5" />, title: 'Real-time KPIs', desc: 'Progress and budget metrics updated automatically' },
              { icon: <Bell className="w-3.5 h-3.5" />, title: 'Early warnings', desc: 'Smart risk notifications before blockers hit' },
              { icon: <Brain className="w-3.5 h-3.5" />, title: 'Predictive analysis', desc: 'AI flags delays and overruns before they happen' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[3px] bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5 border border-primary/20">
                  {f.icon}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-white">{f.title}</p>
                  <p className="text-[11px] text-[#8B949E] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

          <p className="text-[11px] text-[#8B949E]">&copy; 2026 Yemoda</p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-[3px] flex items-center justify-center">
                <span className="text-white font-bold text-xs">YM</span>
              </div>
              <span className="font-bold text-foreground text-sm">Yemoda</span>
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-[18px] font-bold text-foreground mb-1">Sign in</h1>
            <p className="text-[13px] text-muted-foreground">Welcome back to Yemoda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-input-background border border-input rounded-[3px] pl-8 pr-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input-background border border-input rounded-[3px] pl-8 pr-10 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded-[3px] border-input accent-primary" />
                <span className="text-[12px] text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-[12px] text-primary hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            {/* Account blocked — email verification required */}
            {emailBlocked && (
              <div className="rounded-[3px] border border-warning/30 bg-warning/5 px-3 py-2.5 flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-warning mb-0.5">Account locked</p>
                  <p className="text-[11px] text-muted-foreground">More than 7 days have passed without verifying your email. Verify your account to continue.</p>
                </div>
                <LoadingButton
                  type="button"
                  loading={resendLoading}
                  onClick={handleResendVerification}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend
                </LoadingButton>
              </div>
            )}

            {/* Submit */}
            <LoadingButton
              type="submit"
              loading={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white rounded-[3px] py-2.5 text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </LoadingButton>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-[0.08em]">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-[3px] border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>

          </form>
          <div className="text-center mt-4">
            <p className="text-[11px] text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
