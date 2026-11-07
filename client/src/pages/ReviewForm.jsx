import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

const defaults = { courseCode: '', rating: 5, comment: '' }

export default function ReviewForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [loadedId, setLoadedId] = useState(null)

  useEffect(() => {
    let active = true
    setError('')
    setLoadedId(null)
    setForm(defaults)
    setLoading(Boolean(id))
    if (!id) return

    api.get('/reviews/' + id)
      .then(({ data }) => {
        if (!active) return
        const { courseCode, rating, comment } = data.review
        setForm({ courseCode, rating, comment: comment || '' })
        setLoadedId(id)
      })
      .catch(err => {
        if (active) setError(err?.response?.data?.message || 'Could not load review')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [id])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'rating' ? Number(value) : value }))
  }

  const unavailable = loading || saving || Boolean(id && loadedId !== id)

  async function onSubmit(e) {
    e.preventDefault()
    if (unavailable) return
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, courseCode: form.courseCode.trim().toUpperCase() }
      if (id) await api.patch('/reviews/' + id, payload)
      else await api.post('/reviews', payload)
      nav('/reviews')
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'Write'} Review</h1>
      {loading && <p role="status">Loading review...</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <fieldset disabled={unavailable} className="space-y-3">
          <label className="block" htmlFor="courseCode">
            Course code
            <input id="courseCode" name="courseCode" className="input" placeholder="CS101"
              value={form.courseCode} onChange={onChange} minLength={2} required />
          </label>
          <label className="block" htmlFor="rating">
            Rating
            <select id="rating" name="rating" className="input" value={form.rating} onChange={onChange}>
              {[1, 2, 3, 4, 5].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}
            </select>
          </label>
          <label className="block" htmlFor="comment">
            Comment
            <textarea id="comment" name="comment" className="input" rows={4}
              value={form.comment} onChange={onChange} />
          </label>
          <button className="btn" type="submit">{saving ? 'Saving...' : 'Save'}</button>
        </fieldset>
        {error && <div role="alert" className="text-red-600 text-sm">{error}</div>}
      </form>
    </div>
  )
}
