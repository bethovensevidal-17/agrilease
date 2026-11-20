import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

const initialForm = {
  name: '',
  category_id: '',
  brand_model: '',
  description: '',
  rate: '',
  available_quantity: '1',
  rate_type: 'hour',
  condition_status: 'good',
  location: 'Victoria, Oriental Mindoro',
  availability: 'available',
};

export default function OwnerEditEquipment() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [equipmentResult, categoryResult] = await Promise.all([
          api('/equipment/mine'),
          api('/categories'),
        ]);

        const equipment = (equipmentResult.data || []).find(
          item => String(item.id) === String(id)
        );

        if (!equipment) {
          setError('Equipment not found in your listings.');
          return;
        }

        setCategories(categoryResult.data || []);

        setForm({
          name: equipment.name || equipment.equipment_name || '',
          category_id: String(equipment.category_id || ''),
          brand_model: equipment.brand_model || '',
          description: equipment.description || '',
          rate: String(equipment.rate ?? equipment.rental_rate ?? ''),
          available_quantity: String(equipment.available_quantity ?? 1),
          rate_type: equipment.rate_type || 'hour',
          condition_status: equipment.condition_status || 'good',
          location: equipment.location || 'Victoria, Oriental Mindoro',
          availability:
            equipment.availability ||
            equipment.availability_status ||
            'available',
        });
      } catch (err) {
        setError(err.message || 'Unable to load equipment details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm(previous => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.category_id || !form.rate) {
      setError('Please complete all required fields.');
      return;
    }

    if (!await window.agrileaseDialog.confirm('Save your changes to this equipment?', { title: 'Save changes', confirmText: 'Save' })) return;

    try {
      setSubmitting(true);

      await api(`/equipment/${id}`, {
        method: 'PUT',
        body: {
          ...form,
          name: form.name.trim(),
          rate: Number(form.rate),
          category_id: Number(form.category_id),
        },
      });

      setSuccess('Equipment details updated successfully.');

      setTimeout(() => {
        navigate('/owner/equipment');
      }, 1000);
    } catch (err) {
      const errors = err.errors;

      setError(
        Array.isArray(errors)
          ? errors.join(' ')
          : err.message || 'Unable to update equipment.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="owner-page">
        <div className="owner-empty-state">
          Loading equipment details...
        </div>
      </div>
    );
  }

  return (
    <div className="owner-page">
      <div className="owner-welcome">
        <div>
          <h1>Edit Equipment</h1>
          <p>Update your agricultural equipment details.</p>
        </div>
      </div>

      <section className="owner-form-panel">
        <div className="owner-form-heading">
          <h2>Equipment Information</h2>
          <p>Update the information below and save your changes.</p>
        </div>

        {error && (
          <div className="owner-form-alert error">{error}</div>
        )}

        {success && (
          <div className="owner-form-alert success">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="owner-form-grid">
            <div className="owner-field">
              <label>Equipment Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="owner-field">
              <label>Category *</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="owner-field">
              <label>Brand / Model</label>
              <input
                name="brand_model"
                value={form.brand_model}
                onChange={handleChange}
              />
            </div>

            <div className="owner-field">
              <label>Rental Rate (PHP) *</label>
              <input
                type="number"
                name="rate"
                value={form.rate}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div className="owner-field">
              <label>Available Quantity *</label>
              <input
                type="number"
                name="available_quantity"
                value={form.available_quantity}
                onChange={handleChange}
                min="1"
                step="1"
                required
              />
            </div>

            <div className="owner-field">
              <label>Rate Type *</label>
              <select
                name="rate_type"
                value={form.rate_type}
                onChange={handleChange}
                required
              >
                <option value="hour">Per Hour</option>
                <option value="day">Per Day</option>
                <option value="hectare">Per Hectare</option>
              </select>
            </div>

            <div className="owner-field">
              <label>Equipment Condition *</label>
              <select
                name="condition_status"
                value={form.condition_status}
                onChange={handleChange}
                required
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>

            <div className="owner-field">
              <label>Location *</label>
              <select
                name="location"
                value={form.location}
                onChange={handleChange}
                required
              >
                <option value="Victoria, Oriental Mindoro">
                  Victoria, Oriental Mindoro
                </option>
                <option value="Socorro, Oriental Mindoro">
                  Socorro, Oriental Mindoro
                </option>
              </select>
            </div>

            <div className="owner-field">
              <label>Availability *</label>
              <select
                name="availability"
                value={form.availability}
                onChange={handleChange}
                required
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <div className="owner-field full">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="5"
              />
            </div>
          </div>

          <div className="owner-form-actions">
            <button
              type="button"
              className="owner-cancel-button"
              onClick={() => navigate('/owner/equipment')}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="owner-submit-button"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}