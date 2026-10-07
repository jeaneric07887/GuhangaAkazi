import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import AdminDashboard from './pages/AdminDashboard'
import {
  AboutPage,
  AccountPage,
  ContactPage,
  DetailPage,
  HomePage,
  ListingPage,
  MessagesPage,
  PrivacyPage,
  SearchPage,
  TermsPage,
} from './pages/PublicPages'
import './App.css'

const pages = {
  '/': ['Home', 'Find business ideas, learn useful skills, and explore opportunities with GuhangaAkazi.'],
  '/ideas': ['Business Ideas', 'Explore practical business ideas, costs, steps, and risks to help plan your next move.'],
  '/skills': ['Skills', 'Find useful skills and practical ways to build your knowledge and income.'],
  '/opportunities': ['Opportunities', 'Explore opportunities and practical steps for getting started.'],
  '/about': ['About Us', 'Learn about GuhangaAkazi and our goal of sharing practical ideas, skills, and opportunities.'],
  '/contact': ['Contact Us', 'Contact GuhangaAkazi with a question, suggestion, problem report, or feedback.'],
  '/account': ['Your Account', 'Create or sign in to your GuhangaAkazi account to send messages and view replies.'],
  '/messages': ['Messages', 'Privately view the messages you sent to GuhangaAkazi and any administrator replies.'],
  '/search': ['Search', 'Search business ideas, skills, and opportunities on GuhangaAkazi.'],
  '/privacy': ['Privacy Policy', 'Learn what information GuhangaAkazi collects through comments and contact forms and how it is used.'],
  '/terms': ['Terms and Disclaimer', 'Read the terms for using GuhangaAkazi and the limits of its educational business information.'],
  '/admin': ['Admin sign in', 'Admin sign-in for managing GuhangaAkazi content.'],
}

function RouteMetadata() {
  const { pathname } = useLocation()
  const route = pathname.replace(/\/+$/, '') || '/'
  useEffect(() => {
    const isDetail = /^\/(ideas|skills|opportunities)\/[^/]+$/.test(route)
    const isPrivate = ['/admin', '/account', '/messages'].includes(route)
    const isIndexable = !isPrivate && (Boolean(pages[route]) || isDetail)
    const [pageTitle, description] = pages[route] || (isDetail
      ? ['Business guide', 'Read practical information, steps, and considerations for this business idea or skill.']
      : ['Page Not Found', 'The page you requested could not be found on GuhangaAkazi.'])
    document.title = route === '/' ? `GuhangaAkazi — ${pageTitle}` : `${pageTitle} | GuhangaAkazi`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[name="robots"]')?.setAttribute(
      'content',
      isIndexable ? 'index, follow' : 'noindex, nofollow',
    )

    const siteUrl = import.meta.env.VITE_SITE_URL
    let canonical = document.querySelector('link[rel="canonical"]')
    if (siteUrl && isIndexable) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.append(canonical)
      }
      canonical.href = new URL(route, siteUrl).href
    } else {
      canonical?.remove()
    }
  }, [route])

  return null
}

function NotFoundPage() {
  return <section className="page-wrap not-found"><span className="eyebrow">404 — Page not found</span><h1>We can’t find that page.</h1><p>The page may have moved, or the link may be broken.</p><Link className="button button-primary" to="/">Go to home <span aria-hidden="true">↗</span></Link></section>
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="ideas" element={<ListingPage type="ideas" />} />
          <Route path="ideas/:id" element={<DetailPage type="ideas" />} />
          <Route path="skills" element={<ListingPage type="skills" />} />
          <Route path="skills/:id" element={<DetailPage type="skills" />} />
          <Route path="opportunities" element={<ListingPage type="opportunities" />} />
          <Route path="opportunities/:id" element={<DetailPage type="opportunities" />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
