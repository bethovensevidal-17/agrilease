import { Link } from 'react-router-dom';
import { assetUrl } from '../api/config';
<<<<<<< HEAD
=======
import { getUser } from '../api/client';
>>>>>>> master
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
<<<<<<< HEAD
=======
  // Farmer: manatili sa farmer layout (may sidebar) pag tiningnan ang equipment.
  const detailsPath = getUser()?.role === 'farmer' ? `/farmer/equipment/${item.id}` : `/equipment/${item.id}`;
>>>>>>> master
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
<<<<<<< HEAD
        <h3><Link to={`/equipment/${item.id}`}>{item.name || item.equipment_name}</Link></h3>
=======
        <h3><Link to={detailsPath}>{item.name || item.equipment_name}</Link></h3>
>>>>>>> master

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
<<<<<<< HEAD
        <Link className="equipment-view-link" to={`/equipment/${item.id}`}>View details and book</Link>
=======
        <Link className="equipment-view-link" to={detailsPath}>View details and book</Link>
>>>>>>> master
      </div>
    </article>
  );
}
