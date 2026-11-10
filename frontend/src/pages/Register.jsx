
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

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
    business_name: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    setLoading(true);

    try {
      const body = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
        address: form.address,
      };

      if (form.role === 'farmer') {
        body.barangay = form.barangay;
      } else {
        body.business_name = form.business_name;
      }

      const response = await api('/auth/register', {
        method: 'POST',
        body,
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
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleRegister}>
        <h1>Create Account</h1>
        <p>Join AGRILEASE today.</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <label>Account Type</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="farmer">Farmer</option>
          <option value="owner">Equipment Owner</option>
        </select>

        <label>Full Name</label>
        <input
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />

        <label>Phone Number</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="09XXXXXXXXX"
          required
        />

        {form.role === 'farmer' ? (
          <>
            <label>Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your address"
              required
            />

            <label>Barangay</label>
            <input
              name="barangay"
              value={form.barangay}
              onChange={handleChange}
              placeholder="Enter your barangay"
              required
            />
          </>
        ) : (
          <>
            <label>Business Name</label>
            <input
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              placeholder="Enter your business name"
              required
            />

            <label>Business Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your business address"
              required
            />
          </>
        )}

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="At least 8 characters"
          minLength={8}
          required
        />

        <label>Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}
