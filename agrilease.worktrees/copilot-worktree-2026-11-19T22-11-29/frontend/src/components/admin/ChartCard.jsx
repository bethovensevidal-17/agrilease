export default function ChartCard({ title, subtitle, children }) {
  return (
    <section className="admin-chart-card">
      <div className="admin-chart-heading">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="admin-chart-content">
        {children}
      </div>
    </section>
  );
}
