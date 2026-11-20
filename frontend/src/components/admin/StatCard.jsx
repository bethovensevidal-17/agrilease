<<<<<<< HEAD
import { ArrowUpRight } from 'lucide-react';

=======
>>>>>>> master
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'green',
}) {
  return (
    <article className={`admin-stat-card ${color}`}>
      <div className="admin-stat-top">
        <span>{title}</span>
        {Icon && <Icon size={21} />}
      </div>

      <strong>{Number(value ?? 0).toLocaleString()}</strong>

      <div className="admin-stat-subtitle">
<<<<<<< HEAD
        <ArrowUpRight size={14} />
=======
>>>>>>> master
        <span>{subtitle}</span>
      </div>
    </article>
  );
}
