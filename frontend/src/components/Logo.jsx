// Marca da Aurelia: monograma "A" em moldura dourada sobre vinho, com o nome em versalete
export default function Logo({ tagline = false }) {
  return (
    <span className="brand" role="img" aria-label="Aurelia, casa de leilões de arte">
      <span className="brand-mark" aria-hidden="true">A</span>
      <span className="brand-text" aria-hidden="true">
        <span className="brand-word">Aurelia</span>
        {tagline && <span className="brand-tag">Casa de leilões de arte</span>}
      </span>
    </span>
  );
}
