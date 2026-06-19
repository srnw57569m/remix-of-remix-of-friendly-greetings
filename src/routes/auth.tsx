import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).default("login").catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in or Create an Account — BeatlY" },
      {
        name: "description",
        content:
          "Log in to BeatlY or create a free account to build, deploy, and manage your own Highrise music bot.",
      },
      { property: "og:title", content: "Sign in or Create an Account — BeatlY" },
      {
        property: "og:description",
        content:
          "Log in or sign up to deploy your personalized Highrise music bot in minutes.",
      },
      { property: "og:url", content: "https://weave-warm-logic.lovable.app/auth" },
      { name: "twitter:title", content: "Sign in or Create an Account — BeatlY" },
      {
        name: "twitter:description",
        content:
          "Log in or sign up to deploy your personalized Highrise music bot in minutes.",
      },
    ],
    links: [{ rel: "canonical", href: "https://weave-warm-logic.lovable.app/auth" }],
  }),
});

const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username must be under 32 characters")
      .regex(/^[A-Za-z0-9_]+$/, "Only letters, numbers and underscores"),
    email: z.string().trim().email("Invalid email").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Required").max(255),
  password: z.string().min(1, "Required").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-70" />
            <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent">
              <Music2 className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <span className="font-display text-xl font-semibold">BeatlY</span>
        </Link>

        <div className="relative w-full animate-fade-up">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 blur-2xl opacity-60" />
          <div className="glass-strong relative rounded-3xl p-8">
            <div className="mb-6 flex rounded-full bg-white/5 p-1">
              <TabLink mode="login" active={mode === "login"}>Login</TabLink>
              <TabLink mode="signup" active={mode === "signup"}>Sign Up</TabLink>
            </div>

            {mode === "login" ? <LoginForm /> : <SignupForm />}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to the platform's Terms & Privacy.
        </p>
      </div>
    </main>
  );
}

function TabLink({ mode, active, children }: { mode: "login" | "signup"; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to="/auth"
      search={{ mode }}
      replace
      className={`flex-1 rounded-full py-2 text-center text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_6px_20px_-6px_oklch(0.62_0.22_250/0.7)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_oklch(0.62_0.22_250/0.15)]";

function LoginForm() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      toast.error(Object.values(errs)[0] ?? "Please fill in your email and password.");
      return;
    }
    setErrors({});

    let email = parsed.data.identifier;
    if (!email.includes("@")) {
      toast.error("Please sign in with your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Welcome back!");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" error={errors.identifier}>
        <input
          name="identifier"
          type="email"
          autoComplete="email"
          placeholder="you@domain.com"
          className={inputCls}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <div className="relative">
          <input
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls + " pr-11"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <SubmitButton loading={loading}>Login</SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        New here?{" "}
        <Link to="/auth" search={{ mode: "signup" }} replace className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      username: fd.get("username"),
      email: fd.get("email"),
      password: fd.get("password"),
      confirm: fd.get("confirm"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: parsed.data.username },
      },
    });
    setLoading(false);

    if (error) {
      // Common case: username unique constraint failed inside trigger
      if (error.message.toLowerCase().includes("username") || error.message.toLowerCase().includes("duplicate")) {
        setErrors({ username: "Username is already taken" });
      } else {
        toast.error(error.message);
      }
      return;
    }

    if (data.session) {
      toast.success("Account created — welcome!");
      navigate({ to: "/" });
    } else {
      toast.success("Check your email to confirm your account.");
      navigate({ to: "/auth", search: { mode: "login" } });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Username" error={errors.username}>
        <input name="username" type="text" autoComplete="username" placeholder="your_handle" className={inputCls} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" autoComplete="email" placeholder="you@domain.com" className={inputCls} />
      </Field>
      <Field label="Password" error={errors.password}>
        <div className="relative">
          <input name="password" type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" className={inputCls + " pr-11"} />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <Field label="Confirm password" error={errors.confirm}>
        <input name="confirm" type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Repeat password" className={inputCls} />
      </Field>

      <SubmitButton loading={loading}>Create account</SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth" search={{ mode: "login" }} replace className="text-accent hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative mt-2 inline-flex w-full items-center justify-center overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
    >
      <span className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary to-accent blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent" />
      <span className="relative flex items-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </span>
    </button>
  );
}
