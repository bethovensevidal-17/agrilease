import { Link } from 'react-router-dom';
import { assetUrl } from '../api/config';
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
          <span>No image</span>
        )}
      </div>

      <div className="card-body">
        <h3><Link to={`/equipment/${item.id}`}>{item.name || item.equipment_name}</Link></h3>

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
        <Link className="equipment-view-link" to={`/equipment/${item.id}`}>View details and book</Link>
      </div>
    </article>
  );
}
