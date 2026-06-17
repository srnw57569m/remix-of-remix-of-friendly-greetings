import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ ["--mx" as any]: "0px", ["--my" as any]: "0px" }}
    >
      {/* Floating orbs */}
      <div
        className="absolute -left-32 top-20 h-[480px] w-[480px] rounded-full bg-primary/30 blur-[120px] animate-float-slow"
        style={{ transform: "translate(var(--mx), var(--my))" }}
      />
      <div
        className="absolute right-[-10%] top-[10%] h-[520px] w-[520px] rounded-full bg-accent/25 blur-[140px] animate-float-slow"
        style={{ animationDelay: "-5s", transform: "translate(calc(var(--mx) * -1), calc(var(--my) * -1))" }}
      />
      <div
        className="absolute left-[30%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-royal/40 blur-[110px] animate-float-slow"
        style={{ animationDelay: "-10s" }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Star dots */}
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/60 animate-glow-pulse"
          style={{
            top: `${(i * 53) % 100}%`,
            left: `${(i * 37 + 11) % 100}%`,
            animationDelay: `${(i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
