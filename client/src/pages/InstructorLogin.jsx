
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function InstructorLogin() {
  const nav = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/instructors/login', {
        username,
        password
      })

      const { token, instructor } = res.data

      if (!token || !instructor) {
        throw new Error('Invalid login response')
      }

      // Store instructor session
      localStorage.setItem(
        'instructor',
        JSON.stringify(instructor)
      )

      localStorage.setItem('instructorToken', token)

      // Redirect to dashboard
      nav('/portal/dashboard', { replace: true })

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Login failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto card">

      <h1 className="text-xl font-semibold mb-1">
        Instructor Portal
      </h1>

      <p className="text-sm text-zinc-600 mb-4">
        Staff sign-in
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">

        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          className="btn"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

      </form>
    </div>
  )
}
