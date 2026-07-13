// Keycap hint (DESIGN: "keycap hints in muted ink", mono for data).
// className extends/overrides for odd surfaces (e.g. on the filled
// primary button, where muted-on-green would vanish).
export function Kbd({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={`rounded-md hairline bg-surface-tint px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-muted ${className}`}
    >
      {children}
    </kbd>
  );
}
