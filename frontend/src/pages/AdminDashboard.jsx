import { useEffect, useState } from 'react'
import { api, uploadMedia } from '../api'

const resourceTabs = [
  ['ideas', 'Business ideas'],
  ['opportunities', 'Opportunities'],
  ['skills', 'Skills'],
]
const sections = [...resourceTabs, ['media', 'Photos and videos'], ['comments', 'Comments'], ['conversations', 'Messages'], ['contacts', 'Contact Us']]
const contactTypeLabels = {
  message: 'General message',
  question: 'Question',
  problem: 'Problem report',
  suggestion: 'Suggestion',
  feedback: 'Feedback',
}
const textFields = [
  ['title', 'Title', true],
  ['description', 'Short description', true],
  ['long_description', 'Full description'],
  ['category', 'Category'],
  ['image_url', 'Image link'],
  ['image_description', 'Image description'],
  ['video_url', 'Video link'],
  ['video_description', 'Video description'],
  ['requirements', 'What you need'],
  ['equipment', 'Tools and supplies'],
  ['target_customers', 'Who might buy from you'],
  ['steps', 'How to get started'],
  ['profitability_notes', 'Costs and income'],
  ['risks', 'Things to watch out for'],
  ['tips', 'Tips'],
]
const emptyForm = {
  title: '',
  description: '',
  long_description: '',
  category: '',
  image_url: '',
  image_description: '',
  video_url: '',
  video_description: '',
  startup_capital: '',
  expected_cost: '',
  expected_revenue: '',
  requirements: '',
  equipment: '',
  target_customers: '',
  steps: '',
  profitability_notes: '',
  risks: '',
  tips: '',
  featured: false,
  published: false,
}
const emptyMediaForm = {
  content_type: 'ideas',
  content_id: '',
  page_slug: null,
  media_type: 'image',
  title: '',
  description: '',
  url: '',
}
const publicPages = [
  ['home', 'Home'],
  ['ideas', 'Business Ideas'],
  ['skills', 'Skills'],
  ['opportunities', 'Opportunities'],
  ['about', 'About Us'],
  ['contact', 'Contact Us'],
  ['search', 'Search'],
  ['privacy', 'Privacy Policy'],
  ['terms', 'Terms and Disclaimer'],
]
const editableFields = Object.keys(emptyForm)

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken'))
  const [admin, setAdmin] = useState(null)
  const [section, setSection] = useState('ideas')
  const [items, setItems] = useState([])
  const [comments, setComments] = useState([])
  const [contacts, setContacts] = useState([])
  const [conversations, setConversations] = useState([])
  const [replyDrafts, setReplyDrafts] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [media, setMedia] = useState([])
  const [mediaForm, setMediaForm] = useState(emptyMediaForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [contentPhoto, setContentPhoto] = useState(null)
  const [contentVideo, setContentVideo] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editingMediaId, setEditingMediaId] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [commentDraft, setCommentDraft] = useState({ name: '', comment: '' })
  const [editingContactId, setEditingContactId] = useState(null)
  const [contactDraft, setContactDraft] = useState({})
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [messageDraft, setMessageDraft] = useState('')
  const [editingConversationId, setEditingConversationId] = useState(null)
  const [conversationDraft, setConversationDraft] = useState({})
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    let conversationTimer
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (section === 'media') {
          const result = await api.adminMedia()
          if (active) setMedia(result.items)
        } else if (section === 'comments') {
          const result = await api.adminComments()
          if (active) setComments(result.items)
        } else if (section === 'contacts') {
          const result = await api.adminContacts()
          if (active) setContacts(result.items)
        } else if (section === 'conversations') {
          const result = await api.adminConversations()
          if (active) setConversations(result.items)
        } else {
          const result = await api.adminList(section)
          if (active) setItems(result.items)
        }
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    if (section === 'conversations') {
      conversationTimer = window.setInterval(async () => {
        try {
          const result = await api.adminConversations()
          if (active) {
            setConversations(result.items)
            setError('')
          }
        } catch (loadError) {
          if (active) setError(loadError.message)
        }
      }, 15_000)
    }
    return () => {
      active = false
      if (conversationTimer) window.clearInterval(conversationTimer)
    }
  }, [token, section])

  async function submitLogin(event) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = await api.login({
        email: data.get('email'),
        password: data.get('password'),
      })
      sessionStorage.setItem('adminToken', result.token)
      setAdmin(result.admin)
      setToken(result.token)
      setNotice(`Welcome, ${result.admin.name}.`)
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  function editItem(item) {
    setEditingId(item.id)
    setContentPhoto(null)
    setContentVideo(null)
    setForm(Object.fromEntries(editableFields.map((field) => [field, item[field] ?? emptyForm[field]])))
    setError('')
    setNotice('')
    document.getElementById('content-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function saveContent(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const body = Object.fromEntries(editableFields.map((field) => [field, form[field]]))
    try {
      if (editingId) await api.update(section, editingId, body)
      else await api.create(section, body)
      const result = await api.adminList(section)
      setItems(result.items)
      setForm(emptyForm)
      setEditingId(null)
      setContentPhoto(null)
      setContentVideo(null)
      setNotice('Changes saved.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function uploadContentPhoto() {
    if (!contentPhoto) {
      setError('Choose a photo from your phone or computer first.')
      return
    }
    if (!contentPhoto.type.startsWith('image/')) {
      setError('Choose a supported photo file.')
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const uploaded = await uploadMedia(contentPhoto)
      setForm((current) => ({ ...current, image_url: uploaded.url }))
      setContentPhoto(null)
      setNotice('Photo uploaded. Save the item to display it on the website.')
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  async function uploadContentVideo() {
    if (!contentVideo) {
      setError('Choose a video from your phone or computer first.')
      return
    }
    if (!contentVideo.type.startsWith('video/')) {
      setError('Choose a supported video file.')
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const uploaded = await uploadMedia(contentVideo)
      setForm((current) => ({ ...current, video_url: uploaded.url }))
      setContentVideo(null)
      setNotice('Video uploaded. Save the item to display it on the website.')
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return
    setError('')
    try {
      await api.remove(section, item.id)
      setItems((current) => current.filter((record) => record.id !== item.id))
      if (editingId === item.id) {
        setEditingId(null)
        setForm(emptyForm)
      }
      setNotice('Item deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function reviewComment(comment, approved) {
    try {
      await api.moderateComment(comment.id, approved)
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, approved } : item))
      setNotice(approved ? 'Comment approved.' : 'Comment hidden.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function deleteComment(comment) {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return
    try {
      await api.removeComment(comment.id)
      setComments((current) => current.filter((item) => item.id !== comment.id))
      setNotice('Comment deleted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function saveComment(event, comment) {
    event.preventDefault()
    try {
      const result = await api.updateComment(comment.id, commentDraft)
      setComments((current) => current.map((item) => item.id === comment.id ? result.item : item))
      setEditingCommentId(null)
      setNotice('Comment updated.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function updateContact(contact, changes) {
    try {
      const result = await api.updateContact(contact.id, changes)
      setContacts((current) => current.map((item) => item.id === contact.id ? result.item : item))
      return true
    } catch (actionError) {
      setError(actionError.message)
      return false
    }
  }

  async function saveContact(event, contact) {
    event.preventDefault()
    if (await updateContact(contact, contactDraft)) {
      setEditingContactId(null)
      setNotice('Contact message updated.')
    }
  }

  async function deleteContact(contact) {
    if (!window.confirm('Delete this contact message? This cannot be undone.')) return
    try {
      await api.removeContact(contact.id)
      setContacts((current) => current.filter((item) => item.id !== contact.id))
      setNotice('Contact message deleted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function sendConversationReply(conversation) {
    const body = replyDrafts[conversation.id]?.trim()
    if (!body) return
    setError('')
    setNotice('')
    setReplyingTo(conversation.id)
    try {
      await api.replyToConversation(conversation.id, body)
      const result = await api.adminConversations()
      setConversations(result.items)
      setReplyDrafts((current) => ({ ...current, [conversation.id]: '' }))
      setNotice('Reply sent. The user can now see it on their Messages page.')
    } catch (replyError) {
      setError(replyError.message)
    } finally {
      setReplyingTo(null)
    }
  }

  async function saveConversationMessage(event, message) {
    event.preventDefault()
    try {
      await api.updateConversationMessage(message.id, messageDraft)
      const result = await api.adminConversations()
      setConversations(result.items)
      setEditingMessageId(null)
      setNotice('Message updated.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function saveConversation(event, conversation) {
    event.preventDefault()
    try {
      await api.updateConversation(conversation.id, conversationDraft)
      const result = await api.adminConversations()
      setConversations(result.items)
      setEditingConversationId(null)
      setNotice('Conversation details updated.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function deleteConversationMessage(message) {
    if (!window.confirm('Delete this message? This cannot be undone.')) return
    try {
      await api.removeConversationMessage(message.id)
      const result = await api.adminConversations()
      setConversations(result.items)
      setNotice('Message deleted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function deleteConversation(conversation) {
    if (!window.confirm('Delete this conversation and all of its messages? This cannot be undone.')) return
    try {
      await api.removeConversation(conversation.id)
      setConversations((current) => current.filter((item) => item.id !== conversation.id))
      setNotice('Conversation deleted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function submitMedia(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const formElement = event.currentTarget
    try {
      const body = {
        ...mediaForm,
        content_id: mediaForm.content_type === 'pages' ? null : Number(mediaForm.content_id),
        page_slug: mediaForm.content_type === 'pages' ? mediaForm.page_slug : null,
      }
      if (editingMediaId) await api.updateMedia(editingMediaId, body)
      else await api.createMedia(body)
      const result = await api.adminMedia()
      setMedia(result.items)
      setMediaForm(emptyMediaForm)
      setPhotoFile(null)
      setEditingMediaId(null)
      formElement.reset()
      setNotice(editingMediaId ? 'Photo or video updated.' : 'Photo or video saved.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function uploadMediaPhoto() {
    if (!photoFile) {
      setError(`Choose a ${mediaForm.media_type} file from your phone or computer first.`)
      return
    }
    if (!photoFile.type.startsWith(`${mediaForm.media_type}/`)) {
      setError(`Choose a ${mediaForm.media_type} file to upload.`)
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const uploaded = await uploadMedia(photoFile)
      const mediaType = photoFile.type.startsWith('video/') ? 'video' : 'image'
      setMediaForm((current) => ({ ...current, media_type: mediaType, url: uploaded.url }))
      setPhotoFile(null)
      setNotice(`${mediaType === 'image' ? 'Photo' : 'Video'} uploaded. Save it to display it with the selected item.`)
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  async function deleteMedia(asset) {
    if (!window.confirm(`Delete “${asset.title}”? This cannot be undone.`)) return
    try {
      await api.removeMedia(asset.id)
      setMedia((current) => current.filter((item) => item.id !== asset.id))
      if (editingMediaId === asset.id) {
        setEditingMediaId(null)
        setMediaForm(emptyMediaForm)
      }
      setNotice('Photo or video deleted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  function logout() {
    sessionStorage.removeItem('adminToken')
    setToken(null)
    setAdmin(null)
    setItems([])
    setComments([])
    setContacts([])
    setNotice('')
    setError('')
  }

  if (!token) {
    return (
      <div className="admin-login-wrap">
        <form className="form-card admin-login" onSubmit={submitLogin}>
          <span className="eyebrow">Admin area</span>
          <h1>Sign in to admin</h1>
          <p>Sign in to manage ideas, skills, opportunities, comments, and messages.</p>
          <label>Email address<input type="email" name="email" autoComplete="username" required /></label>
          <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit">Sign in <span aria-hidden="true">↗</span></button>
          <small>Admin accounts are provided by the site owner.</small>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div><span className="eyebrow">Manage site content</span><h1>Admin dashboard</h1><p>{admin ? `Signed in as ${admin.email}` : 'You are signed in.'}</p></div>
        <button className="button button-outline" type="button" onClick={logout}>Sign out</button>
      </header>
      <nav className="admin-tabs" aria-label="Admin sections">
        {sections.map(([key, label]) => <button type="button" className={section === key ? 'admin-tab active' : 'admin-tab'} onClick={() => { setSection(key); setError(''); setNotice('') }} key={key}>{label}</button>)}
      </nav>
      {error && <p className="form-error admin-message" role="alert">{error}</p>}
      {notice && <p className="form-success admin-message" role="status">{notice}</p>}
      {loading && <p className="notice">Loading…</p>}

      {!loading && resourceTabs.some(([key]) => key === section) && (
        <div className="admin-content">
          <section className="admin-records">
            <div className="admin-section-title"><div><span className="eyebrow">{sections.find(([key]) => key === section)?.[1]}</span><h2>Manage {sections.find(([key]) => key === section)?.[1].toLowerCase()}</h2></div><button type="button" className="button button-primary" onClick={() => { setEditingId(null); setForm(emptyForm); setContentPhoto(null); setContentVideo(null); setError(''); setNotice('') }}>+ Add new</button></div>
            {items.length === 0 && <p className="notice">There are no items yet. Use the form to add one.</p>}
            <div className="admin-item-list">
              {items.map((item) => <article className="admin-item" key={item.id}>
                <div><h3>{item.title}</h3><p>{item.description}</p><small>Item #{item.id}</small><span className={item.published ? 'status-pill status-published' : 'status-pill'}>{item.published ? 'Published' : 'Draft'}</span></div>
                <div className="admin-item-actions"><button type="button" className="small-button" onClick={() => editItem(item)}>Edit</button><button type="button" className="small-button danger-button" onClick={() => deleteItem(item)}>Delete</button></div>
              </article>)}
            </div>
          </section>
          <form className="form-card admin-editor" id="content-editor" onSubmit={saveContent}>
            <span className="eyebrow">{editingId ? 'Edit item' : 'Add something new'}</span>
            <h2>{editingId ? 'Edit details' : `Add ${({ ideas: 'a business idea', opportunities: 'an opportunity', skills: 'a skill' })[section]}`}</h2>
            <label>Choose photo
              <input key={contentPhoto?.name || 'empty-content-photo'} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp,image/tiff,image/heic,image/heif,image/x-icon,image/vnd.microsoft.icon,.heic,.heif,.ico" onChange={(event) => setContentPhoto(event.target.files?.[0] || null)} />
              <small>Select a photo from your phone or computer.</small>
            </label>
            <button className="button button-outline upload-button" type="button" onClick={uploadContentPhoto} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload photo'}</button>
            {form.image_url && <img className="admin-photo-preview" src={form.image_url} alt="Photo preview" />}
            <label>Choose video from computer or phone
              <input key={contentVideo?.name || 'empty-content-video'} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/x-ms-wmv,video/mpeg,video/3gpp,video/3gpp2,video/ogg,video/x-flv,video/x-m4v,video/mp2t" onChange={(event) => setContentVideo(event.target.files?.[0] || null)} />
              <small>Select a video from your phone or computer.</small>
            </label>
            <button className="button button-outline upload-button" type="button" onClick={uploadContentVideo} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload video'}</button>
            {form.video_url && form.video_url.includes('/uploads/')
              && <video className="admin-photo-preview" controls preload="metadata" aria-label="Video preview"><source src={form.video_url} /></video>}
            {textFields.map(([field, label, required]) => (
              <label key={field}>{label}
                {['long_description', 'requirements', 'equipment', 'target_customers', 'steps', 'profitability_notes', 'risks', 'tips'].includes(field)
                  ? <textarea rows={field === 'long_description' ? 5 : 3} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} maxLength={10000} required={required} />
                  : <input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} maxLength={field === 'title' ? 180 : field === 'description' ? 500 : 2000} required={required} />}
              </label>
            ))}
            <div className="number-fields">
              {[['startup_capital', 'Start-up cost'], ['expected_cost', 'Expected costs'], ['expected_revenue', 'Expected income']].map(([field, label]) => <label key={field}>{label}<input type="text" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} maxLength={200} placeholder="Enter an amount or range" /></label>)}
            </div>
            <div className="checkbox-fields">
              {['featured', 'published'].map((field) => <label className="checkbox-label" key={field}><input type="checkbox" checked={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.checked })} /> {field === 'featured' ? 'Show on the home page' : 'Publish on the site'}</label>)}
            </div>
            <p className="upload-hint">Upload photos or videos, add their descriptions, then save the item to display them on the website.</p>
            <div className="editor-actions"><button className="button button-primary" type="submit" disabled={uploading}>{editingId ? 'Save changes' : 'Save item'} <span aria-hidden="true">↗</span></button>{editingId && <button className="button button-outline" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setContentPhoto(null); setContentVideo(null) }}>Cancel</button>}</div>
          </form>
        </div>
      )}

      {!loading && section === 'media' && (
        <section className="admin-feedback">
          <div className="admin-section-title"><div><span className="eyebrow">Photos and videos</span><h2>Manage photos and videos</h2></div></div>
          <form className="form-card media-editor" onSubmit={submitMedia}>
            <div className="number-fields">
              <label>Display on<select value={mediaForm.content_type} onChange={(event) => {
                const contentType = event.target.value
                setMediaForm({ ...mediaForm, content_type: contentType, content_id: '', page_slug: contentType === 'pages' ? 'home' : null })
              }} required>
                {resourceTabs.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                <option value="pages">Public page</option>
              </select></label>
              {mediaForm.content_type === 'pages'
                ? <label>Public page<select value={mediaForm.page_slug} onChange={(event) => setMediaForm({ ...mediaForm, page_slug: event.target.value })} required>{publicPages.map(([slug, label]) => <option value={slug} key={slug}>{label}</option>)}</select></label>
                : <label>Content ID<input type="number" min="1" step="1" value={mediaForm.content_id} onChange={(event) => setMediaForm({ ...mediaForm, content_id: event.target.value })} required /></label>}
              <label>Media type<select value={mediaForm.media_type} onChange={(event) => { setMediaForm({ ...mediaForm, media_type: event.target.value, url: '' }); setPhotoFile(null) }} required><option value="image">Photo</option><option value="video">Video</option></select></label>
            </div>
            <label>Title<input value={mediaForm.title} onChange={(event) => setMediaForm({ ...mediaForm, title: event.target.value })} maxLength={180} required /></label>
            <label>Description<input value={mediaForm.description} onChange={(event) => setMediaForm({ ...mediaForm, description: event.target.value })} maxLength={500} /></label>
            {mediaForm.media_type === 'image' ? <>
              <label>Choose photo
                <input key={photoFile?.name || 'empty-media-photo'} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp,image/tiff,image/heic,image/heif,image/x-icon,image/vnd.microsoft.icon,.heic,.heif,.ico" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
                <small>Select a photo from your phone or computer. Common photo formats are supported.</small>
              </label>
              <button className="button button-outline upload-button" type="button" onClick={uploadMediaPhoto} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload photo'}</button>
              {mediaForm.url && <img className="admin-photo-preview" src={mediaForm.url} alt="Photo preview" />}
            </> : <>
              <label>Choose video
                <input key={photoFile?.name || 'empty-media-video'} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/x-ms-wmv,video/mpeg,video/3gpp,video/3gpp2,video/ogg,video/x-flv,video/x-m4v,video/mp2t" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
                <small>Select a video file from your phone or computer, or enter an external video link below.</small>
              </label>
              <button className="button button-outline upload-button" type="button" onClick={uploadMediaPhoto} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload video'}</button>
              <label>Video link (HTTP or HTTPS)<input type="url" value={mediaForm.url} onChange={(event) => setMediaForm({ ...mediaForm, url: event.target.value })} maxLength={2000} /></label>
              {mediaForm.url.includes('/uploads/') && <video className="admin-photo-preview" controls preload="metadata" aria-label="Video preview"><source src={mediaForm.url} /></video>}
            </>}
            <p className="upload-hint">Choose a photo or video file, upload it, then save it to display it with the selected item.</p>
            <div className="editor-actions">
              <button className="button button-primary" type="submit" disabled={uploading || !mediaForm.url}>{editingMediaId ? 'Save changes' : 'Save photo or video'} <span aria-hidden="true">↗</span></button>
              {editingMediaId && <button className="button button-outline" type="button" onClick={() => { setEditingMediaId(null); setMediaForm(emptyMediaForm); setPhotoFile(null) }}>Cancel</button>}
            </div>
          </form>
          <div className="admin-item-list media-admin-list">
            {media.length === 0 && <p className="notice">No photos or videos have been added.</p>}
            {media.map((asset) => <article className="admin-item" key={asset.id}>
                    <div><h3>{asset.title}</h3><p>{asset.description || asset.url}</p><span className="status-pill">{asset.media_type === 'image' ? 'Photo' : 'Video'} · {asset.content_type === 'pages' ? publicPages.find(([slug]) => slug === asset.page_slug)?.[1] : `${{ ideas: 'business ideas', opportunities: 'opportunities', skills: 'skills' }[asset.content_type]} #${asset.content_id}`}</span></div>
                    <div className="admin-item-actions"><button type="button" className="small-button" onClick={() => { setEditingMediaId(asset.id); setPhotoFile(null); setMediaForm({ content_type: asset.content_type, content_id: asset.content_id ? String(asset.content_id) : '', page_slug: asset.page_slug || 'home', media_type: asset.media_type, title: asset.title, description: asset.description || '', url: asset.url }); setError(''); setNotice('') }}>Edit</button><button type="button" className="small-button danger-button" onClick={() => deleteMedia(asset)}>Delete</button></div>
            </article>)}
          </div>
        </section>
      )}

      {!loading && section === 'comments' && (
        <section className="admin-feedback">
          <div className="admin-section-title"><div><span className="eyebrow">Community comments</span><h2>Review comments</h2></div></div>
          {comments.length === 0 && <p className="notice">There are no comments yet.</p>}
          {comments.map((comment) => <article className="feedback-item" key={comment.id}>
            <div>
              <strong>{comment.name}</strong><span className={comment.approved ? 'status-pill status-published' : 'status-pill'}>{comment.approved ? 'Approved' : 'Waiting for review'}</span>
              {editingCommentId === comment.id
                ? <form className="admin-inline-editor" onSubmit={(event) => saveComment(event, comment)}>
                  <label>Name<input value={commentDraft.name} onChange={(event) => setCommentDraft({ ...commentDraft, name: event.target.value })} maxLength={100} required /></label>
                  <label>Comment<textarea value={commentDraft.comment} onChange={(event) => setCommentDraft({ ...commentDraft, comment: event.target.value })} maxLength={2000} rows={4} required /></label>
                  <div className="admin-item-actions"><button className="small-button" type="submit">Save changes</button><button className="small-button" type="button" onClick={() => setEditingCommentId(null)}>Cancel</button></div>
                </form>
                : <p>{comment.comment}</p>}
              <small>{comment.content_type && `On ${{ ideas: 'business ideas', opportunities: 'opportunities', skills: 'skills' }[comment.content_type]} #${comment.content_id}`} · {new Date(comment.created_at).toLocaleString('en-RW')}</small>
            </div>
            <div className="admin-item-actions">
              {!comment.approved && <button className="small-button" type="button" onClick={() => reviewComment(comment, true)}>Approve</button>}
              {comment.approved && <button className="small-button" type="button" onClick={() => reviewComment(comment, false)}>Hide</button>}
              <button className="small-button" type="button" onClick={() => { setEditingCommentId(comment.id); setCommentDraft({ name: comment.name, comment: comment.comment }) }}>Edit</button>
              <button className="small-button danger-button" type="button" onClick={() => deleteComment(comment)}>Delete</button>
            </div>
          </article>)}
        </section>
      )}

      {!loading && section === 'contacts' && (
        <section className="admin-feedback">
          <div className="admin-section-title"><div><span className="eyebrow">Messages from visitors</span><h2>Contact Us messages</h2></div></div>
          {contacts.length === 0 && <p className="notice">There are no messages yet.</p>}
          {contacts.map((contact) => <article className="feedback-item contact-feedback-item" key={contact.id}>
            <div>
              {editingContactId === contact.id
                ? <form className="admin-inline-editor" onSubmit={(event) => saveContact(event, contact)}>
                  <label>Name<input value={contactDraft.name || ''} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} maxLength={100} required /></label>
                  <label>Email<input type="email" value={contactDraft.email || ''} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} maxLength={254} required /></label>
                  <label>Message type<select value={contactDraft.contact_type || 'message'} onChange={(event) => setContactDraft({ ...contactDraft, contact_type: event.target.value })}>{Object.entries(contactTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label>Status<select value={contactDraft.status || 'new'} onChange={(event) => setContactDraft({ ...contactDraft, status: event.target.value })}><option value="new">New</option><option value="read">Read</option><option value="archived">Archived</option></select></label>
                  <label>Message<textarea value={contactDraft.message || ''} onChange={(event) => setContactDraft({ ...contactDraft, message: event.target.value })} maxLength={5000} rows={5} required /></label>
                  <div className="admin-item-actions"><button className="small-button" type="submit">Save changes</button><button className="small-button" type="button" onClick={() => setEditingContactId(null)}>Cancel</button></div>
                </form>
                : <>
                  <div className="contact-message-heading">
                    <strong>{contact.name} · <a href={`mailto:${contact.email}`}>{contact.email}</a></strong>
                    <span className={`status-pill ${contact.status === 'new' ? 'status-needs-action' : ''}`}>{contact.status === 'new' ? 'New — needs review' : { read: 'Read', archived: 'Archived' }[contact.status] || contact.status}</span>
                  </div>
                  <span className="status-pill contact-type-pill">{contactTypeLabels[contact.contact_type] || 'General message'}</span>
                  <p>{contact.message}</p>
                </>}
              <small>{new Date(contact.created_at).toLocaleString('en-RW')}</small>
            </div>
            <div className="admin-item-actions contact-actions">
              <a className="small-button" href={`mailto:${contact.email}?subject=${encodeURIComponent('Re: Your message to GuhangaAkazi')}`}>Reply by email</a>
              {contact.status !== 'read' && <button className="small-button" type="button" onClick={() => updateContact(contact, { status: 'read' })}>Mark as read</button>}
              <button className="small-button" type="button" onClick={() => updateContact(contact, { status: contact.status === 'archived' ? 'new' : 'archived' })}>{contact.status === 'archived' ? 'Restore' : 'Archive'}</button>
              <button className="small-button" type="button" onClick={() => { setEditingContactId(contact.id); setContactDraft({ name: contact.name, email: contact.email, contact_type: contact.contact_type, status: contact.status, message: contact.message }) }}>Edit</button>
              <button className="small-button danger-button" type="button" onClick={() => deleteContact(contact)}>Delete</button>
            </div>
          </article>)}
        </section>
      )}

      {!loading && section === 'conversations' && (
        <section className="admin-feedback">
          <div className="admin-section-title"><div><span className="eyebrow">Private conversations</span><h2>User messages and replies</h2></div></div>
          {conversations.length === 0 && <p className="notice">There are no user conversations yet.</p>}
          {conversations.map((conversation) => (
            <article className="feedback-item conversation-card" key={conversation.id}>
              <div>
                {editingConversationId === conversation.id
                  ? <form className="admin-inline-editor" onSubmit={(event) => saveConversation(event, conversation)}>
                    <label>Name<input value={conversationDraft.name || ''} onChange={(event) => setConversationDraft({ ...conversationDraft, name: event.target.value })} maxLength={100} required /></label>
                    <label>Email<input type="email" value={conversationDraft.email || ''} onChange={(event) => setConversationDraft({ ...conversationDraft, email: event.target.value })} maxLength={254} required /></label>
                    <label>WhatsApp number<input type="tel" value={conversationDraft.whatsapp_number || ''} onChange={(event) => setConversationDraft({ ...conversationDraft, whatsapp_number: event.target.value })} maxLength={24} required /></label>
                    <label>Message type<select value={conversationDraft.contact_type || 'message'} onChange={(event) => setConversationDraft({ ...conversationDraft, contact_type: event.target.value })}>{Object.entries(contactTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                    <label>Status<select value={conversationDraft.status || 'pending'} onChange={(event) => setConversationDraft({ ...conversationDraft, status: event.target.value })}><option value="pending">Pending reply</option><option value="replied">Replied</option></select></label>
                    <div className="admin-item-actions"><button className="small-button" type="submit">Save changes</button><button className="small-button" type="button" onClick={() => setEditingConversationId(null)}>Cancel</button></div>
                  </form>
                  : <>
                    <div className="contact-message-heading">
                      <strong>{conversation.name} · <a href={`mailto:${conversation.email}`}>{conversation.email}</a></strong>
                      <span className={`status-pill ${conversation.status === 'pending' ? 'status-needs-action' : 'status-published'}`}>{conversation.status === 'pending' ? 'Pending reply' : 'Replied'}</span>
                    </div>
                    <p><strong>WhatsApp:</strong> <a href={`https://wa.me/${conversation.whatsapp_number}`} target="_blank" rel="noreferrer">+{conversation.whatsapp_number}</a></p>
                    <span className="status-pill contact-type-pill">{contactTypeLabels[conversation.contact_type] || 'General message'}</span>
                  </>}
                <ol className="conversation-thread">
                  {conversation.messages.map((message) => (
                    <li className={`conversation-message ${message.sender_type === 'admin' ? 'admin-reply' : ''}`} key={message.id}>
                      <strong>{message.sender_type === 'admin' ? 'Administrator' : conversation.name}</strong>
                      <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                      {editingMessageId === message.id
                        ? <form className="admin-inline-editor" onSubmit={(event) => saveConversationMessage(event, message)}>
                          <label>Edit message<textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={5000} rows={4} required /></label>
                          <div className="admin-item-actions"><button className="small-button" type="submit">Save changes</button><button className="small-button" type="button" onClick={() => setEditingMessageId(null)}>Cancel</button></div>
                        </form>
                        : <p>{message.body}</p>}
                      <div className="admin-item-actions">
                        <button className="small-button" type="button" onClick={() => { setEditingMessageId(message.id); setMessageDraft(message.body) }}>Edit</button>
                        <button className="small-button danger-button" type="button" onClick={() => deleteConversationMessage(message)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ol>
                <ul className="notification-status-list" aria-label="Admin notification delivery">
                  {(conversation.notifications || []).map((notification) => (
                    <li key={notification.channel}>
                      {notification.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} notification: <strong>{notification.status}</strong>
                      {notification.status === 'retrying' && ` (attempt ${notification.attempts})`}
                      {notification.status === 'failed' && ' — check the backend notification logs and provider settings.'}
                    </li>
                  ))}
                </ul>
                <small>Received {new Date(conversation.created_at).toLocaleString()}</small>
                <form className="conversation-reply-form" onSubmit={(event) => { event.preventDefault(); void sendConversationReply(conversation) }}>
                  <label htmlFor={`reply-${conversation.id}`}>Write a reply</label>
                  <textarea id={`reply-${conversation.id}`} value={replyDrafts[conversation.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [conversation.id]: event.target.value }))} maxLength={5000} rows={4} required />
                  <button className="button button-primary" type="submit" disabled={replyingTo === conversation.id || !replyDrafts[conversation.id]?.trim()}>{replyingTo === conversation.id ? 'Sending…' : 'Send reply'} <span aria-hidden="true">↗</span></button>
                </form>
                <button className="small-button" type="button" onClick={() => { setEditingConversationId(conversation.id); setConversationDraft({ name: conversation.name, email: conversation.email, whatsapp_number: `+${conversation.whatsapp_number}`, contact_type: conversation.contact_type, status: conversation.status }) }}>Edit conversation details</button>
                <button className="small-button danger-button" type="button" onClick={() => deleteConversation(conversation)}>Delete conversation</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
