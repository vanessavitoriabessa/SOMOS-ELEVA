export default function StatCard({
  label, value, detail, icon,
}: {
  label: string; value: string; detail: string; icon: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-detail">{detail}</span>
      </div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}
