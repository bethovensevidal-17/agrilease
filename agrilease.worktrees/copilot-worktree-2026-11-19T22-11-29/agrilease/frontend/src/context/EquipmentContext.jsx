import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/equipment';

const EquipmentContext = createContext();

export const EquipmentProvider = ({ children }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEquipment = async () => {
    try {
      setLoading(true);
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

  return (
    <EquipmentContext.Provider value={{ equipment, loading, error }}>
      {children}
    </EquipmentContext.Provider>
  );
};

export const useEquipment = () => {
  return useContext(EquipmentContext);
};