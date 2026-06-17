import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Wand2, Shield, LayoutDashboard, Settings2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { property: "og:url", content: "https://weave-warm-logic.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://weave-warm-logic.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BeatlY",
          url: "https://weave-warm-logic.lovable.app/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "BeatlY",
          url: "https://weave-warm-logic.lovable.app/",
        }),
      },
    ],
  }),
});

const features = [
  {
    icon: Wand2,
    title: "Easy Setup",
    desc: "Create your bot within minutes using a guided setup process — no commands, no configs.",
  },
  {
    icon: Settings2,
    title: "Full Management",
    desc: "Start, stop, and configure your bot anytime from a beautifully crafted control panel.",
  },
  {
    icon: Shield,
    title: "Secure Hosting",
    desc: "Reliable deployment, encrypted credentials, and account isolation by default.",
  },
  {
    icon: LayoutDashboard,
    title: "Premium Dashboard",
    desc: "Monitor playback, queues, logs and members — all from one polished cockpit.",
  },
];

function LandingPage() {
  return (
    <main className="relative">
      {/* ===== HERO ===== */}
      <section className="relative isolate min-h-screen overflow-hidden pt-40 pb-24 sm:pt-44">
        <AnimatedBackground />

        <div className="mx-auto max-w-5xl px-6 text-center animate-fade-up">
          <div className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Powered by next-gen music engines</span>
          </div>

          <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            Build Your <span className="text-gradient">Music Bot</span>
            <br /> In Minutes
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create, deploy, and manage your own music bot without technical knowledge. Just connect, customize, and play.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-3.5 text-base font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.03]"
            >
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-accent to-primary blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent" />
              <span className="relative">Get Started</span>
              <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#features"
              className="glass rounded-full px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
            >
              See features
            </a>
          </div>

          {/* Glass console mock */}
          <div className="relative mx-auto mt-20 max-w-3xl animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 blur-2xl opacity-60" />
            <div className="glass-strong relative rounded-3xl p-6">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["#vibes", "#lounge", "#focus"].map((c, i) => (
                  <div key={c} className="glass rounded-2xl p-4 text-left">
                    <div className="text-xs text-muted-foreground">{i === 0 ? "Room 1" : i === 1 ? "Room 2" : "Room 3"}</div>
                    <div className="mt-1 font-medium">{c}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-accent">
                      <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-accent" />
                      {i === 2 ? "ONline" : "Online"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              Everything you need to <span className="text-gradient">go live</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              A premium platform that takes care of the heavy lifting so you can focus on the vibe.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative animate-fade-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/40 to-accent/40 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />
                <div className="glass-strong relative h-full rounded-3xl p-6 transition-transform duration-500 group-hover:-translate-y-1">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_8px_30px_-8px_oklch(0.62_0.22_250/0.7)]">
                    <f.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING TEASER ===== */}
      <section id="pricing" className="relative py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="glass-strong relative overflow-hidden rounded-3xl p-12">
            <div className="absolute inset-0 bg-hero opacity-50" />
            <div className="relative">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Ready to launch your bot?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Create your account and spin up your first music bot in under two minutes.
              </p>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="group relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-3.5 text-base font-semibold text-primary-foreground"
              >
                <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-accent blur-md opacity-70 group-hover:opacity-100" />
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent" />
                <span className="relative">Get Started</span>
                <ArrowRight className="relative h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
