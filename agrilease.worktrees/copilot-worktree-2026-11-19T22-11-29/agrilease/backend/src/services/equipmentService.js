import { Equipment } from '../models/Equipment';

export const getAllEquipment = async () => {
  try {
    const equipmentList = await Equipment.find();
    return equipmentList;
  } catch (error) {
    throw new Error('Error retrieving equipment: ' + error.message);
  }
};

export const getEquipmentById = async (id) => {
  try {
    const equipment = await Equipment.findById(id);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    return equipment;
  } catch (error) {
    throw new Error('Error retrieving equipment: ' + error.message);
  }
};

export const createEquipment = async (equipmentData) => {
  try {
    const newEquipment = new Equipment(equipmentData);
    await newEquipment.save();
    return newEquipment;
  } catch (error) {
    throw new Error('Error creating equipment: ' + error.message);
  }
};

export const updateEquipment = async (id, equipmentData) => {
  try {
    const updatedEquipment = await Equipment.findByIdAndUpdate(id, equipmentData, { new: true });
    if (!updatedEquipment) {
      throw new Error('Equipment not found');
    }
    return updatedEquipment;
  } catch (error) {
    throw new Error('Error updating equipment: ' + error.message);
  }
};

export const archiveEquipment = async (id) => {
  try {
    const archivedEquipment = await Equipment.findByIdAndUpdate(id, { archived: true }, { new: true });
    if (!archivedEquipment) {
      throw new Error('Equipment not found');
    }
    return archivedEquipment;
  } catch (error) {
    throw new Error('Error archiving equipment: ' + error.message);
  }
};