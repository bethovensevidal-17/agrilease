import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/equipment';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function EquipmentDetails() {
  const { id } = useParams();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      try {
        const response = await api(`/equipment/${id}`);
        setEquipment(response.data);
      } catch (err) {
        setError(err.message || 'Unable to fetch equipment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentDetails();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="equipment-details">
      <h1>{equipment.name}</h1>
      <p><strong>Category:</strong> {equipment.category}</p>
      <p><strong>Brand/Model:</strong> {equipment.brandModel}</p>
      <p><strong>Description:</strong> {equipment.description}</p>
      <p><strong>Rate Type:</strong> {equipment.rateType}</p>
      <p><strong>Location:</strong> {equipment.location}</p>
      <p><strong>Availability:</strong> {equipment.availability ? 'Available' : 'Not Available'}</p>
      <p><strong>Approval Status:</strong> {equipment.approvalStatus}</p>
      {equipment.image && <img src={equipment.image} alt={equipment.name} />}
    </div>
  );
}