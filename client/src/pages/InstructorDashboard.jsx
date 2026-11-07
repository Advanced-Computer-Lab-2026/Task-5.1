
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function InstructorDashboard() {
  const nav = useNavigate()

  const [instructor, setInstructor] = useState(null)
  const [directory, setDirectory] = useState([])
  const [term, setTerm] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('instructor')
    const token = localStorage.getItem('instructorToken')

    // Redirect if session information is missing
    if (!raw || !token) {
      localStorage.removeItem('instructor')
      localStorage.removeItem('instructorToken')
      nav('/portal', { replace: true })
      return
    }

    try {
      const savedInstructor = JSON.parse(raw)

      if (!savedInstructor || !savedInstructor.id) {
        throw new Error('Invalid instructor session')
      }

      setInstructor(savedInstructor)

    } catch {
      localStorage.removeItem('instructor')
      localStorage.removeItem('instructorToken')
      nav('/portal', { replace: true })
      return
    }

    // Load public instructor directory
    api.get('/instructors')
      .then(res => {
        setDirectory(res.data.instructors || [])
      })
      .catch(() => {
        setError('Failed to load instructor directory')
      })

  }, [nav])

  async function onSearch(e) {
    e.preventDefault()
    setError('')
    setResults(null)

    if (!term.trim()) {
      setError('Please enter an instructor name')
      return
    }

    try {
      const res = await api.get('/instructors/search', {
        params: {
          name: term.trim()
        }
      })

      setResults(res.data.instructors || [])

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Search failed'
      )
    }
  }

  function logout() {
    localStorage.removeItem('instructor')
    localStorage.removeItem('instructorToken')

    nav('/portal', { replace: true })
  }

  if (!instructor) {
    return null
  }

  return (
    <div className="space-y-4">

      {/* Instructor profile */}
      <div className="card flex items-start justify-between">

        <div>
          <h1 className="text-xl font-semibold">
            Welcome, {instructor.name}
          </h1>

          <div className="text-sm text-zinc-600">
            @{instructor.username}
            {' • '}
            {instructor.department}
            {' • '}
            role: <b>{instructor.role}</b>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn"
        >
          Log out
        </button>

      </div>

      {/* Search instructors */}
      <div className="card">

        <h2 className="font-semibold mb-2">
          Find an instructor
        </h2>

        <form
          onSubmit={onSearch}
          className="flex items-center gap-2"
        >

          <input
            className="input"
            placeholder="Search by name (e.g. Smith)"
            value={term}
            onChange={e => setTerm(e.target.value)}
          />

          <button className="btn" type="submit">
            Search
          </button>

        </form>

        {error && (
          <div className="text-red-600 text-sm mt-2">
            {error}
          </div>
        )}

        {results !== null && (
          <div className="mt-3 space-y-2">

            <div className="text-sm text-zinc-600">
              {results.length} result(s)
            </div>

            {results.map(r => (
              <div
                key={r._id}
                className="text-sm border border-zinc-200 rounded-lg p-3"
              >
                <div className="font-medium">
                  {r.name}
                </div>

                <div className="text-zinc-600">
                  {r.department} • {r.role}
                </div>
              </div>
            ))}

          </div>
        )}

      </div>

      {/* Public instructor directory */}
      <div className="card">

        <h2 className="font-semibold mb-2">
          Directory
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

          {directory.map(d => (
            <div
              key={d._id}
              className="text-sm border border-zinc-200 rounded-lg p-2"
            >

              <div className="font-medium">
                {d.name}
              </div>

              <div className="text-zinc-600">
                {d.department} • {d.role}
              </div>

            </div>
          ))}

          {directory.length === 0 && (
            <div className="text-sm text-zinc-600">
              No instructors.
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
