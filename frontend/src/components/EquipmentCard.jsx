import { Link } from 'react-router-dom';
import { assetUrl } from '../api/config';
import { Tractor } from 'lucide-react';
import { getUser } from '../api/client';
const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const unit = {
  hour: 'per hour',
  day: 'per day',
  hectare: 'per hectare',
};

export default function EquipmentCard({ item }) {
  // Farmer: manatili sa farmer layout (may sidebar) pag tiningnan ang equipment.
  const detailsPath = getUser()?.role === 'farmer' ? `/farmer/equipment/${item.id}` : `/equipment/${item.id}`;
  const imageUrl = item.image_path
    ? assetUrl(`/uploads/${item.image_path.replace(/^\/+/, '')}`)
    : null;

  return (
    <article className="card">
      <div className="card-img">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name || item.equipment_name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="card-noimg"><Tractor size={34} strokeWidth={1.6} />No photo yet</span>
        )}
      </div>

      <div className="card-body">
        <h3><Link to={detailsPath}>{item.name || item.equipment_name}</Link></h3>

        <p className="muted">
          {item.category_name}
          {item.brand_model ? ` · ${item.brand_model}` : ''}
        </p>

        <p className="price">
          {peso.format(Number(item.rate ?? item.rental_rate))}
          <small>
            {' '}
            {unit[item.rate_type] || `per ${item.rate_type}`}
          </small>
        </p>

        <p className="muted">{item.location}</p>
        <p className="muted">Owner: {item.owner_name}</p>
        <Link className="equipment-view-link" to={detailsPath}>View details and book</Link>
      </div>
    </article>
  );
}
