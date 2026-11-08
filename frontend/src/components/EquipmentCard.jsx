const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const unit = { hourly: 'per hour', daily: 'per day', hectare: 'per hectare' };

export default function EquipmentCard({ item }) {
  return (
    <article className="card">
      <div className="card-img">
        {item.image_path ? (
          <img src={item.image_path} alt={item.name} loading="lazy" />
        ) : (
          <span>No image</span>
        )}
      </div>
      <div className="card-body">
        <h3>{item.name}</h3>
        <p className="muted">{item.category_name}{item.brand_model ? ` · ${item.brand_model}` : ''}</p>
        <p className="price">{peso.format(item.rate)} <small>{unit[item.rate_type]}</small></p>
        <p className="muted">{item.location}</p>
        <p className="muted">Owner: {item.owner_name}</p>
      </div>
    </article>
  );
}
