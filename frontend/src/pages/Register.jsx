import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.9 5.2A10.8 10.8 0 0121 12a11.8 11.8 0 01-3.1 3.9M6.2 6.2A12 12 0 003 12s3.3 7 9 7a9.8 9.8 0 004.1-.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12s3.3-7 9.5-7 9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'farmer',
    address: '',
    barangay: '',
  });

  const [businessPermit, setBusinessPermit] = useState(null);
  const [governmentId, setGovernmentId] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'role' && value === 'farmer') {
      setBusinessPermit(null);
      setGovernmentId(null);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.role === 'owner') {
      if (!businessPermit || !governmentId) {
        setError('Please upload your Business Permit and Government ID.');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
      ];

      if (
        !allowedTypes.includes(businessPermit.type) ||
        !allowedTypes.includes(governmentId.type)
      ) {
        setError('PDF, JPG, at PNG files lamang ang pinapayagan.');
        return;
      }

      if (
        businessPermit.size > 5 * 1024 * 1024 ||
        governmentId.size > 5 * 1024 * 1024
      ) {
        setError('Each document must not exceed 5MB.');
        return;
      }
    }

    setLoading(true);

    try {
      const data = new FormData();

      data.append('full_name', form.full_name);
      data.append('email', form.email);
      data.append('password', form.password);
      data.append('phone', form.phone);
      data.append('role', form.role);

      if (form.role === 'farmer') {
        data.append('address', form.address);
        data.append('barangay', form.barangay);
      } else {
        data.append('business_permit', businessPermit);
        data.append('government_id', governmentId);
      }

      await api('/auth/register', {
        method: 'POST',
        formData: data,
      });

      if (form.role === 'owner') {
        setSuccess(
          'Registration submitted! Your equipment owner account is pending administrator approval.'
        );
      } else {
        setSuccess(
          'Registration successful! You can now log in to your account.'
        );
      }

      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-container auth-container--register">
      <form
        className="auth-card auth-card--register"
        onSubmit={handleRegister}
        encType="multipart/form-data"
      >
        <div className="auth-logo auth-logo--register">
          <img
            src="/agrilease-logo.png"
            alt="AGRILEASE logo"
          />
        </div>

        <div className="auth-heading">
          <h1>Create Account</h1>
          <p>Join AGRILEASE today.</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="auth-success" role="status">
            {success}
          </div>
        )}

        <div className="auth-fields">
          <div className="auth-field">
            <label htmlFor="register-role">Account Type</label>
            <select
              id="register-role"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="farmer">Farmer</option>
              <option value="owner">Equipment Owner</option>
            </select>
          </div>

          <div className="auth-grid">
            <div className="auth-field">
              <label htmlFor="register-name">Full Name</label>
              <input
                id="register-name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">Email Address</label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-phone">Phone Number</label>
              <input
                id="register-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
                autoComplete="tel"
                required
              />
            </div>

            {form.role === 'farmer' && (
              <div className="auth-field">
                <label htmlFor="register-barangay">Barangay</label>
                <input
                  id="register-barangay"
                  name="barangay"
                  value={form.barangay}
                  onChange={handleChange}
                  placeholder="Enter your barangay"
                  required
                />
              </div>
            )}
          </div>

          {form.role === 'farmer' && (
            <div className="auth-field">
              <label htmlFor="register-address">Address</label>
              <input
                id="register-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter your complete address"
                autoComplete="street-address"
                required
              />
            </div>
          )}

          {form.role === 'owner' && (
            <div className="auth-grid auth-grid--documents">
              <div className="auth-field">
                <label htmlFor="business-permit">Business Permit</label>
                <input
                  id="business-permit"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setBusinessPermit(e.target.files[0] || null)
                  }
                  required
                />
                <small className="field-hint">
                  PDF, JPG, or PNG. Maximum 5MB.
                </small>
              </div>

              <div className="auth-field">
                <label htmlFor="government-id">Government ID</label>
                <input
                  id="government-id"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setGovernmentId(e.target.files[0] || null)
                  }
                  required
                />
                <small className="field-hint">
                  Any valid government-issued ID. Maximum 5MB.
                </small>
              </div>
            </div>
          )}

          <div className="auth-grid">
            <div className="auth-field">
              <label htmlFor="register-password">Password</label>
              <div className="password-wrapper">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-confirm-password">
                Confirm Password
              </label>
              <div className="password-wrapper">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                  title={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                >
                  <EyeIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </main>
  );
}
