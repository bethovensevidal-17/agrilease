import express from 'express';
import {
  listEquipment,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  approveEquipment,
  rejectEquipment
} from '../controllers/equipmentController';
import {
  validateEquipment,
  validateEquipmentUpdate
} from '../validators/equipmentValidator';

const router = express.Router();

// Route to list all equipment
router.get('/', listEquipment);

// Route to add new equipment
router.post('/', validateEquipment, addEquipment);

// Route to update existing equipment
router.patch('/:id', validateEquipmentUpdate, updateEquipment);

// Route to delete equipment
router.delete('/:id', deleteEquipment);

// Route to approve equipment
router.patch('/:id/approve', approveEquipment);

// Route to reject equipment
router.patch('/:id/reject', rejectEquipment);

export default router;