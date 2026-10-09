import { useEffect, useState } from 'react'
import { api } from '../api'

export default function MediaGallery({ page }) {
  const [state, setState] = useState({ items: [], error: '', loading: true })

  useEffect(() => {
    let active = true
    api.media(page)
      .then((result) => {
        if (active) setState({ items: result.items || [], error: '', loading: false })
      })
      .catch((error) => {
        if (active) setState({ items: [], error: error.message, loading: false })
      })
    return () => { active = false }
  }, [page])

  if (state.loading) return null
  if (state.error) return <section className="media-gallery page-wrap"><p className="notice notice-error" role="alert">{state.error}</p></section>
  if (!state.items.length) return null

  return (
    <section className="media-gallery page-wrap">
      <div className="section-heading">
        <div><span className="eyebrow">Photos and videos</span><h2>{page === 'home' ? 'From across GuhangaAkazi' : 'More to explore'}</h2></div>
      </div>
      <div className="content-grid">
        {state.items.map((asset) => (
          <article className="media-card" key={asset.id}>
            <div className="media-frame">
              {asset.media_type === 'image'
                ? <img src={asset.url} alt={asset.description || asset.title} loading="lazy" />
                : asset.url.includes('/uploads/')
                  ? <video controls preload="metadata" aria-label={asset.title}><source src={asset.url} /></video>
                  : <a className="media-frame-link" href={asset.url} target="_blank" rel="noreferrer">Watch video ↗</a>}
            </div>
            <span className="eyebrow">{asset.media_type === 'image' ? 'Photo' : 'Video'}</span>
            <strong>{asset.title}</strong>
            {asset.description && <p>{asset.description}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}
