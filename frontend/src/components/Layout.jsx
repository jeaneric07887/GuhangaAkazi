import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import MediaGallery from './MediaGallery'
import { CONTACT_EMAIL, WHATSAPP_NUMBER, WHATSAPP_URL } from '../contact'

const profilePhoto = 'https://avatars.githubusercontent.com/u/206629465?v=4'

const links = [
  ['Business Ideas', '/ideas'],
  ['Skills', '/skills'],
  ['Opportunities', '/opportunities'],
  ['About Us', '/about'],
  ['Contact Us', '/contact'],
]
const mediaPages = new Set(['ideas', 'skills', 'opportunities', 'about', 'contact', 'search', 'privacy', 'terms'])

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const page = pathname === '/'
    ? 'home'
    : mediaPages.has(pathname.slice(1))
      ? pathname.slice(1)
      : null

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" onClick={closeMenu} aria-label="GuhangaAkazi: home">
            <span className="brand-mark" aria-hidden="true">G</span>
            <span>Guhanga<span className="brand-accent">Akazi</span></span>
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav id="primary-navigation" className={menuOpen ? 'primary-nav is-open' : 'primary-nav'}>
            <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => isActive ? 'nav-link home-nav-link active' : 'nav-link home-nav-link'}>
              <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="m2.5 9 7.5-6 7.5 6M4.5 8v9h4v-5h3v5h4V8" /></svg>
              Home
            </NavLink>
            {links.map(([label, to]) => (
              <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {label}
              </NavLink>
            ))}
            <Link className="search-link" to="/search" onClick={closeMenu} aria-label="Search">
              <span aria-hidden="true">⌕</span> Search
            </Link>
            <Link className="nav-link" to="/messages" onClick={closeMenu}>Messages</Link>
            <Link className="nav-link" to="/account" onClick={closeMenu}>Account</Link>
            <Link className="nav-admin" to="/admin" onClick={closeMenu}>Admin</Link>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
        {page && <MediaGallery key={page} page={page} />}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-group">
            <Link className="brand footer-brand" to="/">
              <span className="brand-mark" aria-hidden="true">G</span>
              <span>Guhanga<span className="brand-accent">Akazi</span></span>
            </Link>
            <p>Ideas, skills, and simple steps to build your own business.</p>
            <span className="footer-copyright">© {new Date().getFullYear()} GuhangaAkazi</span>
          </div>
          <div className="footer-contact">
            <strong>Contact Us</strong>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp: {WHATSAPP_NUMBER}</a>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms and Disclaimer</Link>
          </div>
          <a className="footer-profile" href="https://github.com/jeaneric07887" target="_blank" rel="noreferrer">
            <img src={profilePhoto} alt="Eric's GitHub profile" loading="lazy" />
            <span>Eric</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
