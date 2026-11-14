import Equipment from '../models/Equipment';
import equipmentService from '../services/equipmentService';

// List all equipment
export const listEquipment = async (req, res) => {
  try {
    const equipment = await equipmentService.getAllEquipment();
    res.status(200).json(equipment);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving equipment', error: error.message });
  }
};

// Add new equipment
export const addEquipment = async (req, res) => {
  try {
    const newEquipment = await equipmentService.createEquipment(req.body);
    res.status(201).json(newEquipment);
  } catch (error) {
    res.status(400).json({ message: 'Error adding equipment', error: error.message });
  }
};

// Update existing equipment
export const updateEquipment = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedEquipment = await equipmentService.updateEquipment(id, req.body);
    res.status(200).json(updatedEquipment);
  } catch (error) {
    res.status(400).json({ message: 'Error updating equipment', error: error.message });
  }
};

// Delete equipment
export const deleteEquipment = async (req, res) => {
  const { id } = req.params;
  try {
    await equipmentService.deleteEquipment(id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: 'Error deleting equipment', error: error.message });
  }
};

// Approve equipment
export const approveEquipment = async (req, res) => {
  const { id } = req.params;
  try {
    const approvedEquipment = await equipmentService.approveEquipment(id);
    res.status(200).json(approvedEquipment);
  } catch (error) {
    res.status(400).json({ message: 'Error approving equipment', error: error.message });
  }
};

// Reject equipment
export const rejectEquipment = async (req, res) => {
  const { id } = req.params;
  try {
    const rejectedEquipment = await equipmentService.rejectEquipment(id);
    res.status(200).json(rejectedEquipment);
  } catch (error) {
    res.status(400).json({ message: 'Error rejecting equipment', error: error.message });
  }
};