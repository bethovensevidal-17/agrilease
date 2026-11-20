
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function OwnerAddEquipment() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const result = await api('/categories');
        setCategories(result.data || []);
      } catch (err) {
        setError(err.message || 'Unable to load equipment categories.');
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm(previous => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG, or WEBP images only.');
      e.target.value = '';
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('Image size must not exceed 1MB.');
      e.target.value = '';
      return;
    }

    setError('');
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.category_id || !form.rate) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (image) {
        formData.append('image', image);
      }

      await api('/equipment', {
        method: 'POST',
        formData,
      });

      setSuccess(
        'Equipment submitted successfully! It is now waiting for Admin approval.'
      );

      setForm(initialForm);
      setImage(null);
      setImagePreview('');

      const imageInput = document.getElementById('equipment-image');

      if (imageInput) {
        imageInput.value = '';
      }
    } catch (err) {
      const errors = err.errors;

      setError(
        Array.isArray(errors)
          ? errors.join(' ')
          : err.message || 'Unable to submit equipment.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="owner-page">
      <div className="owner-welcome">
        <div>
          <h1>Add Equipment</h1>
          <p>
            Register your agricultural equipment for rental on AGRILEASE.
          </p>
        </div>
      </div>

      <section className="owner-form-panel">
        <div className="owner-form-heading">
          <h2>Equipment Information</h2>
          <p>Fields marked with * are required.</p>
        </div>

        {error && (
          <div className="owner-form-alert error">{error}</div>
        )}

        {success && (
          <div className="owner-form-alert success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="owner-form-grid">
            <div className="owner-field">
              <label>Equipment Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Kubota Tractor"
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
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories
                    ? 'Loading categories...'
                    : 'Select category'}
                </option>

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
                placeholder="e.g. Kubota L3408"
              />
            </div>

            <div className="owner-field">
              <label>Rental Rate (PHP) *</label>
              <input
                type="number"
                name="rate"
                value={form.rate}
                onChange={handleChange}
                placeholder="Enter rental rate"
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
                placeholder="Describe your equipment, its features, and its intended use..."
                rows="5"
              />
            </div>

            <div className="owner-field full">
              <label>Equipment Image</label>
              <input
                id="equipment-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              <small>Accepted formats: JPG, PNG, WEBP. Maximum size: 1MB.</small>

              {imagePreview && (
                <div style={{ marginTop: '12px' }}>
                  <img
                    src={imagePreview}
                    alt="Equipment preview"
                    style={{
                      width: '220px',
                      height: '160px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="owner-form-note">
            <strong>Admin Approval Required</strong>
            <p>
              Your equipment will be submitted with Pending status.
              It will only appear in the Farmer equipment listings
              after Admin approval.
            </p>
          </div>

          <div className="owner-form-actions">
            <button
              type="button"
              className="owner-cancel-button"
              onClick={() => navigate('/owner/equipment')}
            >
              Back
            </button>

            <button
              type="submit"
              className="owner-submit-button"
              disabled={submitting || loadingCategories}
            >
              {submitting ? 'Submitting...' : 'Submit Equipment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
