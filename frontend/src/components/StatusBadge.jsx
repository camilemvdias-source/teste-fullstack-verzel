const LABELS = { live: 'Ao vivo', scheduled: 'Agendado', ended: 'Encerrado', cancelled: 'Cancelado' };

export default function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{LABELS[status] ?? status}</span>;
}
