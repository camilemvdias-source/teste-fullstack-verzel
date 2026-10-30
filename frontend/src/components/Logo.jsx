// Marca da Aurelia: selo redondo com o "A" em serifa itálica, como um carimbo de leilão
export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <circle cx="20" cy="20" r="19" fill="var(--ink)" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="var(--on-ink)" strokeOpacity=".55" strokeWidth=".8" />
      <text x="20.6" y="27.4" textAnchor="middle" fontFamily="'Source Serif 4', Georgia, serif" fontStyle="italic" fontSize="21" fill="var(--on-ink)">A</text>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo" role="img" aria-label="Aurelia">
      <LogoMark size={38} />
    </span>
  );
}
