import { useEffect, useState } from 'react';
import { api } from '../../api/equipment';
import Pagination from '../admin/Pagination';

export default function EquipmentTable() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchEquipment() {
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

    fetchEquipment();
  }, []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedEquipment = equipment.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="equipment-table">
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Loading equipment...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Name</th>
              <th>Rental Rate</th>
              <th>Condition</th>
              <th>Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedEquipment.map(item => (
              <tr key={item.id}>
                <td>{item.owner}</td>
                <td>{item.name}</td>
                <td>{item.rentalRate}</td>
                <td>{item.condition}</td>
                <td>{item.approvalStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination
        totalItems={equipment.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}