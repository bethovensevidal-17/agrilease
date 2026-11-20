import { useEffect, useState } from 'react';
import { api } from '../api/equipment';
import EquipmentTable from '../components/equipment/EquipmentTable';
import EquipmentFilters from '../components/equipment/EquipmentFilters';
import Pagination from '../components/admin/Pagination';

export default function EquipmentManagement() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  async function loadEquipment() {
    try {
      setLoading(true);
      const response = await api('/equipment');
      setEquipment(response.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load equipment data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEquipment();
  }, []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedEquipment = equipment.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="equipment-management-page">
      <h1>Equipment Management</h1>
      {error && <div className="error-message">{error}</div>}
      <EquipmentFilters />
      {loading ? (
        <div>Loading equipment...</div>
      ) : (
        <>
          <EquipmentTable equipment={displayedEquipment} />
          <Pagination
            totalItems={equipment.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}