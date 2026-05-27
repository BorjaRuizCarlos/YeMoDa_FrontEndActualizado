import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Eye, EyeOff, Lock, Mail, User, ArrowRight,
  Shield, Zap, Users, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { LoadingButton } from '../components/LoadingButton';
import { toast } from 'sonner';
import { authService } from '../../services';

type View = 'form' | 'verify-email';

export default function Register() {
  const [view, setView] = useState<View>('form');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Password strength
  const getPasswordStrength = (pwd: string) => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
    if (/\d/.test(pwd)) s++;
    if (/[^a-zA-Z0-9]/.test(pwd)) s++;
    return s;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const strengthColors = ['bg-destructive', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordStrength < 2) {
      toast.error('Password is too weak');
      return;
    }
    setIsLoading(true);
    try {
      await authService.register(email, name.trim(), password);
      setView('verify-email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    const nickname = window.prompt('Elige tu nickname para continuar con Google:')?.trim() ?? '';
    if (!nickname) {
      toast.error('Debes ingresar un nickname para continuar con Google.');
      return;
    }
    setIsGoogleLoading(true);
    authService.startGoogleLogin(nickname);
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      toast.success('Verification email sent!');
      setResendCooldown(60);
    } catch {
      toast.error('Could not resend. Try again shortly.');
    } finally {
      setResendLoading(false);
    }
  };

  const inputClass =
    'w-full bg-input-background border border-input rounded-[3px] pl-8 pr-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-[#010409] border-r border-[#21262D] flex-col justify-between p-10">
        <div>
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
            Join a smarter way<br />
            <span className="text-primary">to manage projects</span>
          </h2>
          <p className="text-[13px] text-[#8B949E] leading-relaxed mb-10">
            Set up your account and give your team the real-time clarity they need &mdash; up and running in minutes.
          </p>

          <div className="space-y-4">
            {[
              { icon: <Shield className="w-3.5 h-3.5" />, title: 'Secure by default', desc: 'Role-based access and encrypted data across all projects' },
              { icon: <Zap className="w-3.5 h-3.5" />, title: 'AI that helps, not hinders', desc: 'Smart alerts and predictions â€” no complex setup required' },
              { icon: <Users className="w-3.5 h-3.5" />, title: 'Built for real teams', desc: 'Engineers, leads, and stakeholders on the same page' },
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

      {/* Right Panel */}
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

          {view === 'form' ? (
            <>
              <div className="mb-7">
                <h1 className="text-[18px] font-bold text-foreground mb-1">Create your account</h1>
                <p className="text-[13px] text-muted-foreground">Get started with Yemoda for free</p>
              </div>

              {/* Google Sign Up */}
              <LoadingButton
                type="button"
                loading={isGoogleLoading}
                onClick={handleGoogleSignUp}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2 bg-card border border-border rounded-[3px] text-[13px] font-medium text-foreground hover:bg-accent transition-colors mb-4"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </LoadingButton>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Full name */}
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Full name</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Work email */}
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Work email</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
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
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-0.5 mb-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-0.5 flex-1 rounded-full transition-colors ${
                              i < passwordStrength ? strengthColors[passwordStrength] : 'bg-input'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] ${passwordStrength < 2 ? 'text-destructive' : passwordStrength < 3 ? 'text-warning' : 'text-success'}`}>
                        {strengthLabels[passwordStrength]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className={`w-full bg-input-background border rounded-[3px] pl-8 pr-10 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
                          : 'border-input focus:ring-primary/30 focus:border-primary'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1 text-[10px] text-destructive">Passwords do not match</p>
                  )}
                </div>

                <LoadingButton
                  type="submit"
                  loading={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors"
                >
                  Create account
                  <ArrowRight className="w-3.5 h-3.5" />
                </LoadingButton>
              </form>

              <p className="text-center text-[11px] text-muted-foreground mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </>
          ) : (
            /* â”€â”€ Email verification sent â”€â”€ */
            <div className="text-center">
              <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>

              <h1 className="text-[18px] font-bold text-foreground mb-2">Check your inbox</h1>
              <p className="text-[13px] text-muted-foreground mb-1 max-w-xs mx-auto leading-relaxed">
                We sent a verification link to
              </p>
              <p className="text-[13px] font-semibold text-foreground mb-5 break-all">{email}</p>
              <p className="text-[11px] text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                Click the link in the email to activate your account. Don&apos;t see it? Check your spam folder.
              </p>

              <LoadingButton
                type="button"
                loading={resendLoading}
                disabled={resendCooldown > 0}
                onClick={handleResend}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-accent border border-border text-foreground rounded-[3px] text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
              </LoadingButton>

              <Link to="/login" className="text-[11px] text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
