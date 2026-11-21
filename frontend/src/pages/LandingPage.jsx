import { Link } from 'react-router-dom';
import { Tractor, Wheat, Droplets, Search, CalendarCheck, BadgeCheck, ShieldCheck, WifiOff, Wallet } from 'lucide-react';
import './landing-page.css';
import './landing-about.css';
import '../logo.css';

// Photo slots: put your own photos in frontend/public/images/ using these file names.
// If a file is missing, the green gradient shows instead, so nothing breaks.
function Photo({ src, alt = '' }) {
  return (
    <div className="lp-photo">
      <img src={src} alt={alt} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
    </div>
  );
}

const categories = [
  { Icon: Tractor, name: 'Tractors', text: 'Land preparation and hauling', img: '/images/tractor.jpg' },
  { Icon: Wheat, name: 'Harvesters', text: 'Rice and corn harvesting', img: '/images/harvester.jpg' },
  { Icon: Droplets, name: 'Irrigation', text: 'Pumps and sprinklers', img: '/images/irrigation.jpg' },
];

const steps = [
  { Icon: Search, title: 'Find equipment', text: 'Filter by type, price, and location.' },
  { Icon: CalendarCheck, title: 'Pick your dates', text: 'Send a rental request for the days you need.' },
  { Icon: BadgeCheck, title: 'Get confirmed', text: 'The owner approves and you get notified.' },
];

function Logo() {
  return (
    <Link to="/" className="lp-logo">
      <i className="has-logo"><img src="/logo-mark.png" alt="" /></i>AGRILEASE
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="lp">
      <div className="lp-top">
      <header className="lp-nav">
        <Logo />
        <a className="lp-link" href="#about">About</a>
        <a className="lp-link" href="#how-it-works">How it works</a>
        <Link className="lp-link" to="/browse">Browse equipment</Link>
        <Link className="lp-link" to="/login">Log in</Link>
        <Link className="lp-btn lp-gold" to="/register" style={{ padding: '9px 18px' }}>Get started</Link>
      </header>

        <section className="lp-hero" id="home">
          <div className="lp-hero-text">
            <h1>Rent the machine.<br />Keep the harvest.</h1>
            <p>Tractors, harvesters, and irrigation pumps from owners near your farm. Request by the hour, day, or hectare.</p>
            <div className="lp-actions">
              <Link className="lp-btn lp-gold" to="/browse"><Search className="lu" />Browse equipment</Link>
              <Link className="lp-btn lp-ghost" to="/register">Create account</Link>
            </div>
            <div className="lp-trust">
              <span><ShieldCheck className="lu" />Verified owners</span>
              <span><WifiOff className="lu" />Works offline</span>
              <span><Wallet className="lu" />Clear pricing</span>
            </div>
          </div>
          <Photo src="/images/hero.jpg" alt="Tractor working in a rice field" />
        </section>
      </div>

      <main>
        <section className="lp-sec lp-about" id="about">
          <Photo src="/images/about.jpg" alt="Farmers with a carabao and cart in a rice field" />
          <div className="lp-about-text">
            <h2>Built for farmers in Oriental Mindoro</h2>
            <p>AGRILEASE connects farmers who need machinery with owners who have it available. Browse equipment, request your dates, and track every rental in one place.</p>
            <ul className="lp-about-list">
              <li>
                <span className="lp-ic"><ShieldCheck className="lu" /></span>
                <div><h3>Verified owners</h3><p>Owners submit a business permit and a valid ID, and an admin approves each listing before it appears.</p></div>
              </li>
              <li>
                <span className="lp-ic"><Wallet className="lu" /></span>
                <div><h3>Clear pricing</h3><p>See the rate per hour, day, or hectare before you send a request.</p></div>
              </li>
              <li>
                <span className="lp-ic"><WifiOff className="lu" /></span>
                <div><h3>Works offline</h3><p>Requests and listings made without internet are saved on your device and sent when you reconnect.</p></div>
              </li>
            </ul>
          </div>
        </section>

        <section className="lp-sec" style={{ paddingTop: 0 }}>
          <h2>What do you need on your field?</h2>
          <p>AGRILEASE helps farmers find and request the machinery they need for their farming activities.</p>
          <div className="lp-cats">
            {categories.map(({ Icon, name, text, img }) => (
              <Link className="lp-cat" to="/browse" key={name}>
                <Photo src={img} alt={name} />
                <div className="lp-cat-text">
                  <h3><Icon className="lu" />{name}</h3>
                  <small>{text}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="how-it-works" style={{ paddingTop: 0 }}>
          <h2>Three steps to your rental</h2>
          <p>Get started with just a few simple steps.</p>
          <div className="lp-steps">
            {steps.map(({ Icon, title, text }) => (
              <article className="lp-step" key={title}>
                <span className="lp-ic"><Icon className="lu" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-cta">
          <div>
            <h2>Make your next farming task easier.</h2>
            <p>Explore equipment rental options and get started today.</p>
          </div>
          <Link className="lp-btn lp-gold" to="/register">Join AGRILEASE</Link>
        </section>
      </main>

      <footer className="lp-footer">
        <Logo />
        <p>Making agricultural equipment more accessible to farmers.</p>
        <div>
          <Link className="lp-link" to="/browse">Browse equipment</Link>
          <Link className="lp-link" to="/login">Log in</Link>
          <Link className="lp-link" to="/register">Register</Link>
        </div>
        <small>© {new Date().getFullYear()} AGRILEASE. All rights reserved.</small>
      </footer>
    </div>
  );
}
