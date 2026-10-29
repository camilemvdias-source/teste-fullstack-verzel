const LABELS = { live: 'Em leilão', scheduled: 'Agendado', ended: 'Encerrado' };

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>;
}
