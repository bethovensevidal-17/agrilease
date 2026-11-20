import { api } from './client';

export async function fetchEquipment() {
  try {
    const response = await api('/admin/equipment');
    return response.data;
  } catch (error) {
    throw new Error('Unable to fetch equipment data.');
  }
}

export async function createEquipment(equipmentData) {
  try {
    const response = await api('/admin/equipment', {
      method: 'POST',
      body: equipmentData,
    });
    return response.data;
  } catch (error) {
    throw new Error('Unable to create equipment.');
  }
}

export async function updateEquipment(equipmentId, equipmentData) {
  try {
    const response = await api(`/admin/equipment/${equipmentId}`, {
      method: 'PATCH',
      body: equipmentData,
    });
    return response.data;
  } catch (error) {
    throw new Error('Unable to update equipment.');
  }
}

export async function deleteEquipment(equipmentId) {
  try {
    await api(`/admin/equipment/${equipmentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    throw new Error('Unable to delete equipment.');
  }
}