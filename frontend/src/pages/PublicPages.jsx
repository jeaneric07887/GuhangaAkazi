import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { CONTACT_EMAIL, WHATSAPP_NUMBER, WHATSAPP_URL } from '../contact'
import CommentSection from '../components/CommentSection'

const labels = {
  ideas: 'Business Ideas',
  skills: 'Skills',
  opportunities: 'Opportunities',
}
const contactTypeLabels = {
  message: 'General message',
  question: 'Question',
  problem: 'Problem report',
  suggestion: 'Suggestion',
  feedback: 'Feedback',
}

function useContent(type, id) {
  const [state, setState] = useState({ loading: true, error: '', item: null, items: [] })
  useEffect(() => {
    let active = true
    const request = id ? api.get(type, id) : api.list(type)
    request.then((result) => {
      if (active) setState({ loading: false, error: '', item: result.item || null, items: result.items || [], media: result.media || [] })
    }).catch((error) => {
      if (active) setState({ loading: false, error: error.message, item: null, items: [], media: [] })
    })
    return () => { active = false }
  }, [type, id])
  return state
}

function ImageWithFallback({ src, alt, className, fallback }) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

function Card({ item, type }) {
  return (
    <article className="content-card">
      <Link className="card-image-wrap" to={`/${type}/${item.id}`} aria-label={`View ${item.title}`}>
        {item.image_url
          ? <ImageWithFallback
            key={item.image_url}
            className="card-image"
            src={item.image_url}
            alt={item.image_description || item.title}
            fallback={<div className={`card-image-placeholder placeholder-${type}`} aria-hidden="true"><span>{type === 'ideas' ? '↗' : type === 'skills' ? '✳' : '◎'}</span></div>}
          />
          : <div className={`card-image-placeholder placeholder-${type}`} aria-hidden="true"><span>{type === 'ideas' ? '↗' : type === 'skills' ? '✳' : '◎'}</span></div>}
        {item.category && <span className="card-category">{item.category}</span>}
      </Link>
      <div className="card-body">
        <h3><Link to={`/${type}/${item.id}`}>{item.title}</Link></h3>
        <p>{item.description}</p>
        {(item.expected_cost?.trim() || item.expected_revenue?.trim()) && (
          <div className="card-estimates">
            {item.expected_cost?.trim() && <span><strong>Expected costs:</strong> {item.expected_cost}</span>}
            {item.expected_revenue?.trim() && <span><strong>Expected income/profit:</strong> {item.expected_revenue}</span>}
          </div>
        )}
        <Link className="text-link" to={`/${type}/${item.id}`}>Learn more <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  )
}

function ContentGrid({ type, items, loading, error, emptyMessage }) {
  if (loading) return <p className="notice">Loading {labels[type].toLowerCase()}…</p>
  if (error) return <p className="notice notice-error" role="alert">{error}</p>
  if (!items.length) return <p className="notice">{emptyMessage || 'There is nothing here yet. Please check back later.'}</p>
  return <div className="content-grid">{items.map((item) => <Card key={item.id} item={item} type={type} />)}</div>
}

export function HomePage() {
  const ideas = useContent('ideas')
  const skills = useContent('skills')
  const opportunities = useContent('opportunities')
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow eyebrow-light">Turn what you know into action</span>
          <h1>Build a better future with what you know.</h1>
          <p>Find useful business ideas, learn new skills, and follow simple steps to start your own business.</p>
          <div className="hero-actions">
            <Link to="/ideas" className="button button-light">Explore ideas <span aria-hidden="true">↗</span></Link>
            <Link to="/opportunities" className="hero-secondary-link">Find opportunities <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-proof"><span className="proof-dot" /> Simple advice to help you take your next step</div>
        </div>
        <span className="hero-index">01 — Make it happen</span>
      </section>

      <section className="intro-strip">
        <span className="eyebrow">A place to start</span>
        <p>Big changes can start with one small idea. Find the skills and support you need to put your idea into action.</p>
        <Link className="text-link" to="/about">Why we are here <span aria-hidden="true">↗</span></Link>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">Turn ideas into action</span><h2>Ideas to explore</h2></div>
          <Link className="text-link" to="/ideas">All ideas <span aria-hidden="true">↗</span></Link>
        </div>
        <ContentGrid type="ideas" items={ideas.items.slice(0, 3)} loading={ideas.loading} error={ideas.error} />
      </section>

      <section className="section-block section-tint">
        <div className="section-heading">
          <div><span className="eyebrow">Learn by doing</span><h2>Skills to help you grow</h2></div>
          <Link className="text-link" to="/skills">All skills <span aria-hidden="true">↗</span></Link>
        </div>
        <ContentGrid type="skills" items={skills.items.slice(0, 3)} loading={skills.loading} error={skills.error} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">Take your next step</span><h2>Opportunities for you</h2></div>
          <Link className="text-link" to="/opportunities">All opportunities <span aria-hidden="true">↗</span></Link>
        </div>
        <ContentGrid type="opportunities" items={opportunities.items.slice(0, 3)} loading={opportunities.loading} error={opportunities.error} />
      </section>

      <section className="closing-banner">
        <div><span className="eyebrow eyebrow-light">Your next step starts here</span><h2>One good idea can make a big difference.</h2></div>
        <Link to="/search" className="button button-light">Find a place to start <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  )
}

export function ListingPage({ type }) {
  const state = useContent(type)
  return (
    <div className="page-wrap">
      <header className="page-heading">
        <span className="eyebrow">Find and learn</span>
        <h1>{labels[type]}</h1>
        <p>Simple information to help you learn and take your next step with confidence.</p>
      </header>
      <ContentGrid type={type} items={state.items} loading={state.loading} error={state.error} />
    </div>
  )
}

export function DetailPage({ type }) {
  const { id } = useParams()
  const { item, media = [], loading, error } = useContent(type, id)
  useEffect(() => {
    if (!item) return
    document.title = `${item.title} | GuhangaAkazi`
    document.querySelector('meta[name="description"]')?.setAttribute('content', item.description)
  }, [item])
  if (loading) return <div className="page-wrap"><p className="notice">Loading details…</p></div>
  if (error || !item) return <div className="page-wrap"><p className="notice notice-error" role="alert">{error || 'We could not find this item.'}</p><Link className="text-link" to={`/${type}`}>Back to {labels[type].toLowerCase()} ↗</Link></div>
  return (
    <>
      <article className="detail-page page-wrap">
        <Link className="back-link" to={`/${type}`}>← Back to {labels[type].toLowerCase()}</Link>
        <div className="detail-grid">
          <div className="detail-copy">
            {item.category && <span className="eyebrow">{item.category}</span>}
            <h1>{item.title}</h1>
            <p className="detail-lead">{item.description}</p>
            <p className="detail-long">{item.long_description || item.description}</p>
            {(item.startup_capital?.trim() || item.expected_cost?.trim() || item.expected_revenue?.trim()) && (
              <section className="cost-callout" aria-label="Estimated costs and income">
                <h2>Costs and expected income</h2>
                <div className="estimate-values">
                  {item.startup_capital?.trim() && <div><span>Estimated start-up cost</span><strong>{item.startup_capital}</strong></div>}
                  {item.expected_cost?.trim() && <div><span>Expected costs</span><strong>{item.expected_cost}</strong></div>}
                  {item.expected_revenue?.trim() && <div><span>Expected income/profit</span><strong>{item.expected_revenue}</strong></div>}
                </div>
                <small>These are estimates, not guarantees. Actual costs and income depend on your location and circumstances.</small>
              </section>
            )}
          </div>
          <div className="detail-visual">
            {item.image_url
              ? <ImageWithFallback
                key={item.image_url}
                src={item.image_url}
                alt={item.image_description || item.title}
                fallback={<div className={`detail-placeholder placeholder-${type}`}><span aria-hidden="true">✳</span><p>Small steps can lead to big things.</p></div>}
              />
              : <div className={`detail-placeholder placeholder-${type}`}><span aria-hidden="true">✳</span><p>Small steps can lead to big things.</p></div>}
            {item.image_url && item.image_description && <p className="media-description">{item.image_description}</p>}
          </div>
        </div>
        <div className="detail-sections">
          <DetailText title="What you need" value={item.requirements} />
          <DetailText title="Tools and supplies" value={item.equipment} />
          <DetailText title="Who might buy from you" value={item.target_customers} />
          <DetailText title="How to get started" value={item.steps} />
          <DetailText title="Costs and income" value={item.profitability_notes} />
          <DetailText title="Things to watch out for" value={item.risks} />
          <DetailText title="Tips" value={item.tips} />
        </div>
        {item.video_url && (item.video_url.includes('/uploads/')
          ? <div className="content-video">
            <video controls preload="metadata" aria-label={item.video_description || `Video about ${item.title}`}><source src={item.video_url} /></video>
            {item.video_description && <p className="media-description">{item.video_description}</p>}
          </div>
          : <a className="media-link" href={item.video_url} target="_blank" rel="noreferrer">
            <span className="media-play" aria-hidden="true">▶</span>
            <span><strong>{item.video_description || 'Watch a video about this idea'}</strong><small>Opens on another site</small></span>
            <span aria-hidden="true">↗</span>
          </a>)}
        {media.length > 0 && (
          <section className="media-gallery">
            <div className="section-heading"><div><span className="eyebrow">Learn more</span><h2>Helpful resources</h2></div></div>
            <div className="content-grid">
              {media.map((asset) => (
                <article className="media-card" key={asset.id}>
                  {asset.media_type === 'image'
                    ? <img src={asset.url} alt={asset.description || asset.title} loading="lazy" />
                    : asset.url.includes('/uploads/')
                      ? <video controls preload="metadata" aria-label={asset.title}><source src={asset.url} /></video>
                      : <a href={asset.url} target="_blank" rel="noreferrer">Watch video ↗</a>}
                  <span className="eyebrow">{asset.media_type === 'image' ? 'Image' : 'Video'}</span><strong>{asset.title}</strong><p>{asset.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </article>
      <div className="page-wrap"><CommentSection contentType={type} contentId={id} /></div>
    </>
  )
}

function DetailText({ title, value }) {
  if (!value) return null
  return <section className="detail-info"><h2>{title}</h2><p>{value}</p></section>
}

export function AboutPage() {
  return (
    <div className="page-wrap text-page">
      <header className="page-heading">
        <span className="eyebrow">About GuhangaAkazi</span>
        <h1>Good ideas have power.<br /><em>Put them to work.</em></h1>
        <p>We help people find and use practical skills.</p>
      </header>
      <section className="about-columns">
        <div><span className="eyebrow">Why we built this site</span><h2>A clear path to new opportunities.</h2></div>
        <div><p>GuhangaAkazi helps people who want to start a business and build a better future. It brings business ideas, learning tools, and new opportunities together in one place.</p><p>We help you take an idea forward by showing what you may need, what it may cost, which skills can help, and what challenges to plan for.</p><Link className="text-link" to="/ideas">Explore business ideas <span aria-hidden="true">↗</span></Link></div>
      </section>
      <section className="values-grid">
        {[
          ['01', 'Made for action', 'Clear steps and useful facts to help you put an idea to work.'],
          ['02', 'Open to everyone', 'Explore and learn without making an account.'],
          ['03', 'Honest estimates', 'Costs and income are estimates, not promises.'],
        ].map(([number, title, text]) => <article className="value-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
      </section>
    </div>
  )
}

export function ContactPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem('userToken')))
  const [form, setForm] = useState({ name: '', whatsapp_number: '', contact_type: 'message', message: '' })
  const [status, setStatus] = useState({ sending: false, error: '', message: '', saved: false })
  useEffect(() => {
    if (!sessionStorage.getItem('userToken')) return
    let active = true
    api.currentUser().then(({ user: account }) => {
      if (!active) return
      setUser(account)
      setForm((current) => ({
        ...current,
        name: account.name,
        whatsapp_number: `+${account.whatsapp_number}`,
      }))
    }).catch((error) => {
      if (active) {
        sessionStorage.removeItem('userToken')
        setStatus((current) => ({ ...current, error: error.message }))
      }
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])
  async function submit(event) {
    event.preventDefault()
    setStatus({ sending: true, error: '', message: '', saved: false })
    try {
      const result = await api.contact(form)
      setStatus({ sending: false, error: '', message: result.message, saved: true })
      setForm((current) => ({ ...current, message: '' }))
    } catch (error) {
      setStatus({ sending: false, error: error.message, message: '', saved: false })
    }
  }
  return (
    <div className="page-wrap contact-page">
      <header className="page-heading"><span className="eyebrow">Get in touch</span><h1>Contact Us</h1><p>Send us a message or question. Sign in to keep a private copy, track replies, and continue the conversation.</p></header>
      <div className="contact-options">
        <a className="contact-option" href={`mailto:${CONTACT_EMAIL}`}><span className="eyebrow">Email us</span><strong>{CONTACT_EMAIL}</strong><span>Open your email app to write to us.</span></a>
        <a className="contact-option whatsapp-option" href={WHATSAPP_URL} target="_blank" rel="noreferrer"><span className="eyebrow">Chat on WhatsApp</span><strong>{WHATSAPP_NUMBER}</strong><span>Start a direct WhatsApp chat with Eric.</span></a>
      </div>
      {!sessionStorage.getItem('userToken') && (
        <section className="form-card contact-form account-required">
          <h2>Sign in to send a private message</h2>
          <p>Create an account to follow your conversation and see administrator replies.</p>
          <Link className="button button-primary" to="/account?register=1">Create an account <span aria-hidden="true">↗</span></Link>
          <Link className="text-link" to="/account">Already have an account? Sign in</Link>
        </section>
      )}
      {sessionStorage.getItem('userToken') && !loading && user && (
        <form className="form-card contact-form" onSubmit={submit}>
          <h2>Send a message</h2>
          <label>Your name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={100} required /></label>
          <label>Your WhatsApp number<input type="tel" value={form.whatsapp_number} onChange={(event) => setForm({ ...form, whatsapp_number: event.target.value })} autoComplete="tel" maxLength={24} required /><small>Include your country code. We’ll save it with your message so we can respond.</small></label>
          <label>What is this about?
            <select value={form.contact_type} onChange={(event) => setForm({ ...form, contact_type: event.target.value })} required>
              <option value="message">General message</option>
              <option value="question">Question</option>
              <option value="problem">Report a problem</option>
              <option value="suggestion">Suggestion</option>
              <option value="feedback">Feedback</option>
            </select>
          </label>
          <label>Your message<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} maxLength={5000} rows={6} required /></label>
          {status.error && <p className="form-error" role="alert">{status.error}</p>}
          {status.message && <p className="form-success" role="status">{status.message} <Link to="/messages">View your Messages</Link></p>}
          <button type="submit" className="button button-primary" disabled={status.sending || loading}>{status.sending ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span></button>
        </form>
      )}
      {loading && <p className="notice">Checking your account…</p>}
    </div>
  )
}

export function AccountPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [registering, setRegistering] = useState(params.get('register') === '1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const values = new FormData(event.currentTarget)
    const body = Object.fromEntries(values.entries())
    try {
      const result = registering ? await api.registerUser(body) : await api.loginUser(body)
      sessionStorage.setItem('userToken', result.token)
      navigate('/messages')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap account-page">
      <form className="form-card account-form" onSubmit={submit}>
        <span className="eyebrow">Private messages</span>
        <h1>{registering ? 'Create your account' : 'Sign in to your account'}</h1>
        <p>Your account keeps your conversations private and lets you see administrator replies.</p>
        {registering && <>
          <label>Your name<input name="name" autoComplete="name" maxLength={100} required /></label>
          <label>Your WhatsApp number<input name="whatsapp_number" type="tel" autoComplete="tel" maxLength={24} required /><small>Include your country code.</small></label>
        </>}
        <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 12 : undefined} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />{registering && <small>Use at least 12 characters.</small>}</label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Please wait…' : registering ? 'Create account' : 'Sign in'} <span aria-hidden="true">↗</span></button>
        <button className="text-link account-mode-toggle" type="button" onClick={() => { setRegistering((value) => !value); setError('') }}>
          {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  )
}

export function MessagesPage() {
  const [signedIn, setSignedIn] = useState(() => Boolean(sessionStorage.getItem('userToken')))
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})
  const [sendingTo, setSendingTo] = useState(null)
  const [loading, setLoading] = useState(signedIn)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!signedIn) return
    let active = true
    let refreshing = false
    async function loadMessages() {
      if (refreshing) return
      refreshing = true
      try {
        const result = await api.userMessages()
        if (active) {
          setItems(result.items)
          setError('')
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        refreshing = false
        if (active) setLoading(false)
      }
    }
    void loadMessages()
    const timer = window.setInterval(loadMessages, 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [signedIn])

  function signOut() {
    sessionStorage.removeItem('userToken')
    setItems([])
    setError('')
    setSignedIn(false)
  }

  async function replyToConversation(conversation) {
    const body = drafts[conversation.id]?.trim()
    if (!body) return
    setSendingTo(conversation.id)
    setError('')
    try {
      const result = await api.replyToMessage(conversation.id, body)
      setItems((current) => current.map((item) => item.id === conversation.id
        ? { ...item, status: result.status, updated_at: result.item.created_at, messages: [...item.messages, result.item] }
        : item))
      setDrafts((current) => ({ ...current, [conversation.id]: '' }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSendingTo(null)
    }
  }

  return (
    <div className="page-wrap messages-page">
      <header className="page-heading">
        <span className="eyebrow">Your account</span>
        <h1>Messages</h1>
        <p>Your conversations with GuhangaAkazi. This page is private to your account and refreshes for new replies.</p>
        {signedIn && <button className="button button-outline" type="button" onClick={signOut}>Sign out</button>}
      </header>
      {!signedIn && <section className="notice"><p>Sign in to view your private messages.</p><Link className="button button-primary" to="/account">Sign in</Link></section>}
      {loading && <p className="notice">Loading your messages…</p>}
      {error && <p className="notice notice-error" role="alert">{error} <Link to="/account">Sign in again</Link></p>}
      {!loading && !error && signedIn && !items.length && <p className="notice">You have not sent a message yet. <Link to="/contact">Contact Us</Link> to start a conversation.</p>}
      {!error && items.map((conversation) => (
        <article className="conversation-card user-conversation" key={conversation.id}>
          <div className="conversation-heading">
            <div><span className="eyebrow">{contactTypeLabels[conversation.contact_type] || 'General message'}</span><h2>Conversation #{conversation.id}</h2></div>
            <span className={`status-pill ${conversation.status === 'replied' ? 'status-published' : 'status-needs-action'}`}>{conversation.status === 'replied' ? 'Replied' : 'Pending'}</span>
          </div>
          <ol className="conversation-thread">
            {conversation.messages.map((message) => (
              <li className={`conversation-message ${message.sender_type === 'admin' ? 'admin-reply' : ''}`} key={message.id}>
                <strong>{message.sender_type === 'admin' ? 'GuhangaAkazi' : 'You'}</strong>
                <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                <p>{message.body}</p>
              </li>
            ))}
          </ol>
          <p className="conversation-date">Sent {new Date(conversation.created_at).toLocaleString()}</p>
          <form className="conversation-reply-form user-reply-form" onSubmit={(event) => { event.preventDefault(); void replyToConversation(conversation) }}>
            <label htmlFor={`message-reply-${conversation.id}`}>Reply in this conversation</label>
            <textarea id={`message-reply-${conversation.id}`} value={drafts[conversation.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [conversation.id]: event.target.value }))} maxLength={5000} rows={3} required />
            <button className="button button-primary" type="submit" disabled={sendingTo === conversation.id || !drafts[conversation.id]?.trim()}>{sendingTo === conversation.id ? 'Sending…' : 'Send reply'} <span aria-hidden="true">↗</span></button>
          </form>
        </article>
      ))}
      {signedIn && <Link className="button button-primary messages-new-button" to="/contact">Send another message</Link>}
    </div>
  )
}

export function PrivacyPage() {
  return (
    <div className="page-wrap text-page">
      <header className="page-heading">
        <span className="eyebrow">Your information</span>
        <h1>Privacy Policy</h1>
        <p>This page explains what information GuhangaAkazi receives when you use its forms and how it is used.</p>
      </header>
      <section className="legal-copy">
        <h2>Information you provide</h2>
        <p>When you create an account, we receive your name, email address, WhatsApp number, and a securely hashed password. When you send a contact message, we save your name, email and WhatsApp contact details, message type, and message in a private conversation. When you submit a comment, we receive your name and comment. Comments are reviewed before they are shown publicly. Do not include passwords, financial account details, or other sensitive information in a message or comment.</p>
        <h2>How we use it</h2>
        <p>Contact conversations are stored in the site database so the site administrator can review and reply. Message notifications may be sent to the site's email and WhatsApp accounts when those integrations are configured. The administrator's replies are stored with your conversation and shown in your private Messages area. Comments are stored for moderation and approved comments may appear on the related public page.</p>
        <h2>Storage and access</h2>
        <p>Information is accessible to authorized site administrators and is kept until it is deleted from the site. The admin sign-in token is stored in your browser session storage and is removed when you sign out or the browser session ends. Hosting, database, and email providers may process information as needed to operate their services.</p>
        <h2>External services and your choices</h2>
        <p>Email, WhatsApp, and other external links take you to third-party services with their own privacy practices. This website does not currently provide a self-service data export or deletion tool. Contact the site administrator with questions about information you submitted or to ask about deletion; requests are handled manually.</p>
        <h2>Contact</h2>
        <p>For a privacy question or request, use the <Link to="/contact">Contact Us page</Link>.</p>
      </section>
    </div>
  )
}

export function TermsPage() {
  return (
    <div className="page-wrap text-page">
      <header className="page-heading">
        <span className="eyebrow">Using this website</span>
        <h1>Terms and Disclaimer</h1>
        <p>GuhangaAkazi shares general educational information about business ideas, skills, and opportunities.</p>
      </header>
      <section className="legal-copy">
        <h2>Educational information only</h2>
        <p>Content is provided for general information and learning. It is not financial, legal, tax, or professional advice. Costs, income, and outcomes depend on your location and circumstances; estimates are not guarantees. Check local requirements, assess risks, and make your own decisions before investing money or starting an activity.</p>
        <h2>Using the site</h2>
        <p>Do not misuse the website, attempt to access its administration functions without permission, submit unlawful or harmful material, or disrupt the service. Comments are subject to review and may be removed.</p>
        <h2>External links</h2>
        <p>Links to other websites are provided for convenience. GuhangaAkazi does not control those sites or guarantee their content, availability, or practices.</p>
        <h2>Contact</h2>
        <p>If you have a question about these terms, please use the <Link to="/contact">Contact Us page</Link>.</p>
      </section>
    </div>
  )
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const [state, setState] = useState({ loading: false, error: '', results: [] })
  useEffect(() => {
    const value = query.trim()
    if (!value) return undefined
    let active = true
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, loading: true, error: '' }))
      api.search(value).then(({ results }) => {
        if (active) setState({ query: value, loading: false, error: '', results })
      }).catch((error) => {
        if (active) setState({ query: value, loading: false, error: error.message, results: [] })
      })
    }, 200)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])
  function submit(event) {
    event.preventDefault()
  }
  const activeQuery = query.trim()
  const pending = Boolean(activeQuery && (state.loading || state.query !== activeQuery))
  return (
    <div className="page-wrap search-page">
      <header className="page-heading"><span className="eyebrow">Search the site</span><h1>What are you looking for?</h1><p>Search ideas, skills, and opportunities by name, topic, or type.</p></header>
      <form className="search-form" onSubmit={submit}><label className="sr-only" htmlFor="site-search">Search ideas, skills, and opportunities</label><input id="site-search" value={query} onChange={(event) => { const value = event.target.value; setParams(value ? { q: value } : {}, { replace: true }) }} placeholder="Try farming, technology, or food…" /><button className="button button-primary" type="submit">Search <span aria-hidden="true">⌕</span></button></form>
      {activeQuery && <p className="result-count">Search results for <strong>“{activeQuery}”</strong></p>}
      {pending && <p className="notice">Searching…</p>}
      {!pending && state.query === activeQuery && state.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {!pending && !state.error && activeQuery && state.query === activeQuery && !state.results.length && <p className="notice">No results found. Try different words.</p>}
      {!pending && !state.error && state.results.length > 0 && state.query === activeQuery && <div className="content-grid">{state.results.map((item) => <Card key={`${item.type}-${item.id}`} item={item} type={item.type} />)}</div>}
    </div>
  )
}
