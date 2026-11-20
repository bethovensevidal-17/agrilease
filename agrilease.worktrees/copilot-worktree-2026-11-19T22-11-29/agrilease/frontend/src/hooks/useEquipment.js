import { useEffect, useState } from 'react';
import { api } from '../api/equipment';

export default function useEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEquipment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/equipment');
      setEquipment(response.data);
    } catch (err) {
      setError(err.message || 'Unable to load equipment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  return { equipment, loading, error, loadEquipment };
}