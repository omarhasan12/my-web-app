
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [fullName, setFullName] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function getInitialSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!active) return

      if (error) {
        setMessage(error.message)
      }

      setSession(data?.session ?? null)
      setLoading(false)
    }

    getInitialSession()

    const { data } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setProfileMessage('')

      if (!session?.user) {
        setFullName('')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setProfileMessage('Profile Load Error: ' + error.message)
        return
      }

      setFullName(data?.full_name ?? '')
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [session])

  async function handleAuth(e) {
    e.preventDefault()
    setMessage('')

    if (!email.trim() || !password) {
      setMessage('ইমেইল ও পাসওয়ার্ড লিখো।')
      return
    }

    const { data, error } = isSignup
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
      : await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

    if (error) {
      setMessage(error.message)
      return
    }

    if (isSignup && !data.session) {
      setMessage('Signup সফল! Login করার আগে ইমেইল যাচাই করো।')
    } else {
      setMessage('')
    }
  }

  async function saveProfile(e) {
    e.preventDefault()

    if (!session?.user) {
      setProfileMessage('আগে Login করো।')
      return
    }

    const name = fullName.trim()

    if (!name) {
      setProfileMessage('তোমার নাম লিখো।')
      return
    }

    setSaving(true)
    setProfileMessage('')

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: session.user.id,
          full_name: name,
        },
        { onConflict: 'id' }
      )

    setSaving(false)

    if (error) {
      setProfileMessage('Save Error: ' + error.message)
    } else {
      setFullName(name)
      setProfileMessage('তোমার নাম Database-এ Save হয়েছে! 🎉')
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('')
      setProfileMessage('')
    }
  }

  if (loading) {
    return <main className="auth-page"><p>লোড হচ্ছে...</p></main>
  }

  if (!session) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={handleAuth}>
          <h1>{isSignup ? 'অ্যাকাউন্ট তৈরি করো' : 'স্বাগতম! 👋'}</h1>
          <p>তোমার অ্যাকাউন্টে প্রবেশ করো</p>

          <label htmlFor="email">ইমেইল</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">পাসওয়ার্ড</label>
          <input
            id="password"
            type="password"
            placeholder="কমপক্ষে ৬ অক্ষর"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />

          <button type="submit">
            {isSignup ? 'Signup' : 'Login'}
          </button>

          {message && <p className="status-message">{message}</p>}

          <button
            type="button"
            className="switch-button"
            onClick={() => {
              setIsSignup(!isSignup)
              setMessage('')
            }}
          >
            {isSignup
              ? 'আগে থেকেই অ্যাকাউন্ট আছে? Login'
              : 'নতুন অ্যাকাউন্ট তৈরি করো'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="dashboard">
      <header>
        <div>
          <h1>My Dashboard 🚀</h1>
          <p>তোমার ব্যক্তিগত ওয়ার্কস্পেসে স্বাগতম</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      <section className="welcome-card">
        <h2>স্বাগতম, {fullName || 'বন্ধু'}! 🎉</h2>
        <p>তুমি সফলভাবে Login করেছো।</p>
        <p>ইমেইল: {session.user.email}</p>

        <form className="profile-form" onSubmit={saveProfile}>
          <label htmlFor="fullName">তোমার পুরো নাম</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="এখানে তোমার নাম লিখো"
            maxLength={100}
            required
          />

          <button type="submit" disabled={saving}>
            {saving ? 'Save হচ্ছে...' : 'নাম Save করো'}
          </button>

          {profileMessage && (
            <p className="status-message">{profileMessage}</p>
          )}
        </form>
      </section>

      <section className="dashboard-grid">
        <article className="stat-card">
          <h3>👤 Account</h3>
          <p>Active</p>
          <small>তোমার Login সেশন চালু আছে</small>
        </article>

        <article className="stat-card">
          <h3>🗄️ Database</h3>
          <p>Supabase</p>
          <small>Profile সংরক্ষণের ব্যবস্থা</small>
        </article>

        <article className="stat-card">
          <h3>🌐 Deployment</h3>
          <p>Local</p>
          <small>পরবর্তী ধাপে অনলাইনে প্রকাশ করব</small>
        </article>
      </section>
    </main>
  )
}
