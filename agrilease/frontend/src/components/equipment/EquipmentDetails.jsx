import { useEffect, useState } from 'react';
import { api } from '../../api/equipment';
import { formatDate } from '../../utils/formatters';

export default function EquipmentDetails({ equipmentId }) {
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      try {
        const response = await api(`/equipment/${equipmentId}`);
        setEquipment(response.data);
      } catch (err) {
        setError(err.message || 'Unable to load equipment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentDetails();
  }, [equipmentId]);

  if (loading) {
    return <div>Loading equipment details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="equipment-details">
      <h2>{equipment.name}</h2>
      <p><strong>Category:</strong> {equipment.category}</p>
      <p><strong>Brand/Model:</strong> {equipment.brandModel}</p>
      <p><strong>Description:</strong> {equipment.description}</p>
      <p><strong>Rate Type:</strong> {equipment.rateType}</p>
      <p><strong>Location:</strong> {equipment.location}</p>
      <p><strong>Availability:</strong> {equipment.availability ? 'Available' : 'Not Available'}</p>
      <p><strong>Approval Status:</strong> {equipment.approvalStatus}</p>
      <p><strong>Date Added:</strong> {formatDate(equipment.createdAt)}</p>
      {equipment.image && <img src={equipment.image} alt={equipment.name} />}
    </div>
  );
}