import { body, validationResult } from 'express-validator';

export const validateEquipment = [
  body('name')
    .notEmpty()
    .withMessage('Equipment name is required.')
    .isString()
    .withMessage('Equipment name must be a string.'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required.')
    .isString()
    .withMessage('Category must be a string.'),
  
  body('brandModel')
    .notEmpty()
    .withMessage('Brand/Model is required.')
    .isString()
    .withMessage('Brand/Model must be a string.'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string.'),
  
  body('rateType')
    .notEmpty()
    .withMessage('Rate type is required.')
    .isString()
    .withMessage('Rate type must be a string.'),
  
  body('location')
    .notEmpty()
    .withMessage('Location is required.')
    .isString()
    .withMessage('Location must be a string.'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL.'),
  
  body('availability')
    .isBoolean()
    .withMessage('Availability must be a boolean value.'),
  
  body('approvalStatus')
    .optional()
    .isString()
    .withMessage('Approval status must be a string.'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];