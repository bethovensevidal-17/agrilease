export default function StatCard({
  title,
  value,
  subtitle,
  color = 'green',
}) {
  return (
    <article className={`admin-stat-card ${color}`}>
      <div className="admin-stat-top">
        <span>{title}</span>
      </div>

      <strong>{Number(value ?? 0).toLocaleString()}</strong>

      <div className="admin-stat-subtitle">
        <span>{subtitle}</span>
      </div>
    </article>
  );
}
