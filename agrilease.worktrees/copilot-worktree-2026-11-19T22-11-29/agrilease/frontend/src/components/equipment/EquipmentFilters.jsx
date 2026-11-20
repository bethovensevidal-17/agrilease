import { useState } from 'react';

export default function EquipmentFilters({ onFilterChange }) {
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = () => {
    onFilterChange({ category, availability, searchTerm });
  };

  return (
    <div className="equipment-filters">
      <input
        type="text"
        placeholder="Search equipment..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          handleFilterChange();
        }}
      />

      <select
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          handleFilterChange();
        }}
      >
        <option value="">All Categories</option>
        <option value="construction">Construction</option>
        <option value="agriculture">Agriculture</option>
        <option value="transportation">Transportation</option>
      </select>

      <select
        value={availability}
        onChange={(e) => {
          setAvailability(e.target.value);
          handleFilterChange();
        }}
      >
        <option value="">All Availability</option>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>
      </select>
    </div>
  );
}