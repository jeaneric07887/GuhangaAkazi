import { useEffect, useState } from 'react'
import { api } from '../api'

export default function CommentSection({ contentType, contentId }) {
  const [comments, setComments] = useState([])
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState({ loading: true, error: '', message: '' })

  useEffect(() => {
    let active = true
    api.comments(contentType, contentId)
      .then(({ items }) => {
        if (active) setComments(items)
      })
      .catch((error) => {
        if (active) setStatus((current) => ({ ...current, error: error.message }))
      })
      .finally(() => {
        if (active) setStatus((current) => ({ ...current, loading: false }))
      })
    return () => { active = false }
  }, [contentType, contentId])

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ loading: false, error: '', message: '' })
    try {
      const result = await api.submitComment({
        name,
        comment,
        content_type: contentType,
        content_id: contentId,
      })
      setName('')
      setComment('')
      setStatus({ loading: false, error: '', message: result.message })
    } catch (error) {
      setStatus({ loading: false, error: error.message, message: '' })
    }
  }

  return (
    <section className="comment-section">
      <div className="section-heading">
        <span className="eyebrow">Community</span>
        <h2>Questions and comments</h2>
      </div>
      <form className="form-card comment-form" onSubmit={handleSubmit}>
        <label>
          Your name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        </label>
        <label>
          Your comment or question
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} required />
        </label>
        <button className="button button-primary" type="submit">Send for review <span aria-hidden="true">↗</span></button>
        {status.message && <p className="form-success" role="status">{status.message}</p>}
        {status.error && <p className="form-error" role="alert">{status.error}</p>}
      </form>
      <div className="comment-list" aria-live="polite">
        {status.loading && <p className="muted">Loading comments…</p>}
        {!status.loading && !status.error && comments.length === 0 && <p className="muted">Be the first to leave a comment.</p>}
        {comments.map((item) => (
          <article className="comment-item" key={item.id}>
            <strong>{item.name}</strong>
            <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('en-RW')}</time>
            <p>{item.comment}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
