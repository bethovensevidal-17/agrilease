import { Link } from 'react-router-dom';
import './landing-page.css';

const equipmentCategories = [
  {
    icon: '🚜',
    name: 'Tractors',
    description: 'Support for land preparation and other farm operations.',
  },
  {
    icon: '🌾',
    name: 'Harvesting Equipment',
    description: 'Make harvesting tasks more efficient and manageable.',
  },
  {
    icon: '💧',
    name: 'Irrigation Equipment',
    description: 'Equipment to help support your farm watering needs.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create an Account',
    description: 'Register as a farmer and set up your account.',
  },
  {
    number: '02',
    title: 'Browse Equipment',
    description: 'Explore agricultural equipment available for rent.',
  },
  {
    number: '03',
    title: 'Submit a Rental Request',
    description: 'Choose your equipment and send your rental request.',
  },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-icon">🌱</span>
          <span>AGRI<span className="logo-highlight">LEASE</span></span>
        </Link>

        <nav className="landing-nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/browse">Browse Equipment</Link>
        </nav>

        <div className="landing-nav-actions">
          <Link to="/login" className="landing-login-link">Log In</Link>
          <Link to="/register" className="landing-register-button">
            Get Started
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="home">
          <div className="landing-hero-content">
            <span className="landing-eyebrow">
              AGRICULTURAL EQUIPMENT RENTAL PLATFORM
            </span>

            <h1>
              Grow More.
              <br />
              <span>Rent Smarter.</span>
            </h1>

            <p>
              Access the agricultural equipment you need without the
              high cost of ownership. AGRILEASE connects farmers with
              equipment rental opportunities in one convenient platform.
            </p>

            <div className="landing-hero-actions">
              <Link to="/browse" className="landing-primary-button">
                Browse Equipment <span>→</span>
              </Link>
              <Link to="/register" className="landing-secondary-button">
                Create an Account
              </Link>
            </div>

            <div className="landing-hero-note">
              <span>✓</span> A convenient way to access farm equipment
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="hero-circle hero-circle-one"></div>
            <div className="hero-circle hero-circle-two"></div>
            <div className="hero-illustration">
              <span className="hero-tractor">🚜</span>
              <div className="hero-ground"></div>
            </div>
            <div className="hero-floating-card">
              <span>🌱</span>
              <div>
                <strong>Better Access</strong>
                <small>For every growing farm</small>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-about" id="about">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">ABOUT AGRILEASE</span>
            <h2>Making Farm Equipment More Accessible</h2>
            <p>
              AGRILEASE is a web-based agricultural equipment rental
              platform designed to help farmers find and request the
              machinery they need for their farming activities.
            </p>
          </div>

          <div className="landing-category-grid">
            {equipmentCategories.map((item) => (
              <article className="landing-category-card" key={item.name}>
                <div className="landing-category-icon">{item.icon}</div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">SIMPLE AND CONVENIENT</span>
            <h2>How AGRILEASE Works</h2>
            <p>Get started with just a few simple steps.</p>
          </div>

          <div className="landing-steps-grid">
            {steps.map((step) => (
              <article className="landing-step-card" key={step.number}>
                <span className="landing-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <span className="landing-eyebrow">START WITH AGRILEASE</span>
            <h2>Make Your Next Farming Task Easier.</h2>
            <p>
              Explore equipment rental opportunities and get started today.
            </p>
          </div>
          <Link to="/register" className="landing-cta-button">
            Join AGRILEASE <span>→</span>
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-icon">🌱</span>
          <span>AGRI<span className="logo-highlight">LEASE</span></span>
        </Link>
        <p>Making agricultural equipment more accessible to farmers.</p>
        <div className="landing-footer-links">
          <Link to="/browse">Browse Equipment</Link>
          <Link to="/login">Log In</Link>
          <Link to="/register">Register</Link>
        </div>
        <small>© {new Date().getFullYear()} AGRILEASE. All rights reserved.</small>
      </footer>
    </div>
  );
}
