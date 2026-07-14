import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/lib/auth";
import type { AuthError } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Mail, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Step = "email" | "code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 30_000;

export function LoginPage() {
  const { requestCode, verifyCode, status, onboarded } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  // "Remember me" defaults to checked: the session persists in localStorage
  // across browser restarts. When unchecked, the session is stored in
  // sessionStorage and cleared when the browser closes.
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const emailValid = EMAIL_RE.test(email.trim());
  const codeValid = code.length === 6;

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || loading) return;
    setLoading(true);
    setError(null);
    const res = await requestCode(email.trim());
    setLoading(false);
    if (res.ok) {
      setStep("code");
      setResendIn(Math.ceil(RESEND_COOLDOWN_MS / 1000));
      setCode("");
    } else {
      setError(res.error);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!codeValid || loading) return;
    setLoading(true);
    setError(null);
    const res = await verifyCode(email.trim(), code, remember);
    if (!res.ok) {
      setLoading(false);
      setError(res.error);
      setCode("");
      return;
    }
    // Success: verifyCode resolves only after the auth context has flipped
    // status to "authenticated" and resolved `onboarded`. Navigate explicitly
    // rather than relying solely on the AuthGate effect, so the user lands on
    // /onboarding (when not yet onboarded) or / immediately.
    setLoading(false);
    const dest = onboarded === false ? "/onboarding" : "/";
    navigate({ to: dest, replace: true });
  }

  // Belt-and-suspenders: if the auth status flips to authenticated for any
  // other reason while we're mounted on /login, route the user onward. This
  // covers the case where the explicit navigate() above races a context update.
  useEffect(() => {
    if (status !== "authenticated") return;
    const dest = onboarded === false ? "/onboarding" : "/";
    navigate({ to: dest, replace: true });
  }, [status, onboarded, navigate]);

  async function handleResend() {
    if (resendIn > 0 || resending) return;
    setResending(true);
    setError(null);
    const res = await requestCode(email.trim());
    setResending(false);
    if (res.ok) {
      setResendIn(Math.ceil(RESEND_COOLDOWN_MS / 1000));
      setCode("");
    } else {
      setError(res.error);
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setCode("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-warm">
            <span className="font-display text-2xl font-bold text-primary-foreground">
              C
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-accent" />
            <span>Calivora</span>
          </div>
        </div>

        <Card className="border-border bg-card shadow-warm-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {step === "email" ? "Welcome to Calivora" : "Check your email"}
            </CardTitle>
            <CardDescription>
              {step === "email"
                ? "Enter your email to get started"
                : "Check your email for a 6-digit code"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleSendCode} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={emailInputRef}
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      data-ocid="login.email_input"
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground shadow-xs transition-smooth placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-error" : undefined}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p
                    id="login-error"
                    role="alert"
                    data-ocid="login.error_state"
                    className="text-sm text-destructive"
                  >
                    {error.message}
                  </p>
                )}

                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="login-remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    disabled={loading}
                    data-ocid="login.remember_me_checkbox"
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                  <label
                    htmlFor="login-remember"
                    className="text-sm leading-tight text-foreground cursor-pointer select-none"
                  >
                    Remember me
                    <span className="block text-xs text-muted-foreground">
                      Keep me signed in on this browser
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-warm hover:opacity-95"
                  disabled={!emailValid || loading}
                  data-ocid="login.send_code_button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending code…
                    </>
                  ) : (
                    <>
                      Send code
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  We'll send a one-time code. No password to remember.
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <label
                    htmlFor="login-code"
                    className="text-sm font-medium text-foreground"
                  >
                    6-digit code
                  </label>
                  <InputOTP
                    id="login-code"
                    maxLength={6}
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      if (error) setError(null);
                    }}
                    data-ocid="login.code_input"
                    disabled={loading}
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        className="size-11 text-base font-mono"
                      />
                      <InputOTPSlot
                        index={1}
                        className="size-11 text-base font-mono"
                      />
                      <InputOTPSlot
                        index={2}
                        className="size-11 text-base font-mono"
                      />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={3}
                        className="size-11 text-base font-mono"
                      />
                      <InputOTPSlot
                        index={4}
                        className="size-11 text-base font-mono"
                      />
                      <InputOTPSlot
                        index={5}
                        className="size-11 text-base font-mono"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <p
                    id="login-error"
                    role="alert"
                    data-ocid="login.error_state"
                    className="text-center text-sm text-destructive"
                  >
                    {error.message}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-warm hover:opacity-95"
                  disabled={!codeValid || loading}
                  data-ocid="login.verify_button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <div className="flex flex-col items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendIn > 0 || resending}
                    data-ocid="login.resend_button"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-smooth hover:opacity-80 disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Resending…
                      </>
                    ) : resendIn > 0 ? (
                      `Resend code in ${resendIn}s`
                    ) : (
                      <>
                        <RefreshCw className="size-3.5" />
                        Resend code
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    data-ocid="login.back_button"
                    className="text-xs text-muted-foreground transition-smooth hover:text-foreground"
                  >
                    Use a different email
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to keep your data private to your account.
        </p>
      </div>
    </div>
  );
}
