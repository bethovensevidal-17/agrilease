import { useEffect, useState } from 'react';
import { api } from '../../api/equipment';

export default function EquipmentForm({ equipment, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brandModel: '',
    description: '',
    rateType: '',
    location: '',
    image: null,
    availability: true,
  });

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        category: equipment.category,
        brandModel: equipment.brandModel,
        description: equipment.description,
        rateType: equipment.rateType,
        location: equipment.location,
        image: null,
        availability: equipment.availability,
      });
    }
  }, [equipment]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleImageChange = (event) => {
    setFormData((prevData) => ({
      ...prevData,
      image: event.target.files[0],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formDataToSubmit = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSubmit.append(key, value);
    });

    await onSubmit(formDataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Equipment Name:
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Category:
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Brand/Model:
          <input
            type="text"
            name="brandModel"
            value={formData.brandModel}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Description:
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Rate Type:
          <input
            type="text"
            name="rateType"
            value={formData.rateType}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Location:
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Image:
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
      </div>
      <div>
        <label>
          Available:
          <input
            type="checkbox"
            name="availability"
            checked={formData.availability}
            onChange={() => setFormData((prevData) => ({
              ...prevData,
              availability: !prevData.availability,
            }))}
          />
        </label>
      </div>
      <button type="submit">Submit</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}