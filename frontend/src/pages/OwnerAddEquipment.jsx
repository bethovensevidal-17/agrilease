
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor } from 'lucide-react';
import { api, getToken } from '../api/client';
import { isNetworkFailure, newRequestId, queueOfflineEquipment } from '../offline/sync';
import { compressImage } from '../utils/imageCompress';

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
  const [compressing, setCompressing] = useState(false);
  const imageRequest = useRef(0);

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

  async function handleImageChange(e) {
    const input = e.target;
    const file = input.files[0];

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG, or WEBP images only.');
      input.value = '';
      return;
    }

    // Napakalaking file (halimbawa RAW o 50MB na litrato) ay hindi na pinoproseso para hindi mag-hang ang phone.
    if (file.size > 20 * 1024 * 1024) {
      setError('This photo is too large. Please choose one under 20MB.');
      input.value = '';
      return;
    }

    const requestNumber = ++imageRequest.current;
    setError('');
    setCompressing(true);

    try {
      // Kung lampas 1MB, kusa itong pinaliliit. Kung pasok na, hindi ito ginagalaw.
      const prepared = await compressImage(file);

      // Kung may mas bagong napili habang nagpoproseso, balewalain ang luma.
      if (requestNumber !== imageRequest.current) return;

      setImage(prepared);
      setImagePreview(URL.createObjectURL(prepared));
    } catch (err) {
      if (requestNumber !== imageRequest.current) return;
      setImage(null);
      setImagePreview('');
      input.value = '';
      setError(err.message || 'Unable to process this image.');
    } finally {
      if (requestNumber === imageRequest.current) setCompressing(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.category_id || !form.rate) {
      setError('Please complete all required fields.');
      return;
    }

    if (!await window.agrileaseDialog.confirm('Submit this equipment listing? It will be visible to farmers right away.', { title: 'Add equipment', confirmText: 'Submit' })) return;
    const requestId = newRequestId();

    function resetForm() {
      setForm(initialForm);
      setImage(null);
      setImagePreview('');
      const imageInput = document.getElementById('equipment-image');
      if (imageInput) imageInput.value = '';
    }

    async function saveOnDevice() {
      await queueOfflineEquipment({ ...form }, image, getToken(), requestId);
      setSuccess(
        'Saved on this device as PENDING SYNC. It has not been sent to the server yet. Once you are back online it is saved automatically and listed right away.'
      );
      resetForm();
    }

    try {
      setSubmitting(true);

      // No connection: keep the form in IndexedDB; it is sent automatically when the connection returns.
      if (!navigator.onLine) {
        await saveOnDevice();
        return;
      }

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (image) {
        formData.append('image', image);
      }

      try {
        await api('/equipment', {
          method: 'POST',
          formData,
          headers: { 'X-Idempotency-Key': requestId },
        });
      } catch (requestError) {
        // The server could not be reached: queue it (the same request id prevents a duplicate if it did arrive).
        if (isNetworkFailure(requestError)) {
          await saveOnDevice();
          return;
        }
        throw requestError;
      }

      setSuccess(
        'Equipment added successfully! It is now visible to farmers.'
      );

      resetForm();
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
      <div className="owner-welcome owner-welcome--banner">
        <span className="owner-welcome-icon"><Tractor size={26} strokeWidth={1.8} /></span>
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
                <option value="maintenance">Maintenance</option>
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
              <small>
                Accepted formats: JPG, PNG, WEBP. Large photos are automatically resized to fit.
              </small>
              {compressing && <small>Optimizing photo...</small>}

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
            <strong>Verified Owner</strong>
            <p>
              Your equipment is listed right away because your owner account
              is verified. An Admin can still take it down if needed.
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
              disabled={submitting || loadingCategories || compressing}
            >
              {submitting ? 'Submitting...' : 'Submit Equipment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
