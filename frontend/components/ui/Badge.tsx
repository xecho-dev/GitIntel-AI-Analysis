import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "secondary" | "tertiary" | "error" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  primary: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  secondary: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  tertiary: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  outline: "border-white/10 text-slate-400",
};

export const Badge = ({ children, variant = "primary" }: BadgeProps) => {
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-sm",
        variants[variant]
      )}
    >
      {children}
    </span>
  );
};
