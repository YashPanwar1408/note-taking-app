import { useCallback, useEffect, useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (path, { token, ...options } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
};

const emptyNote = { topic: '', status: 'To do', notes: '' };

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('notes-token') || '');
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  const loadNotes = useCallback(async (authToken) => {
    const result = await request('/notes', { token: authToken });
    setNotes(result.data);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    const restoreSession = async () => {
      try {
        const result = await request('/auth/me', { token });
        if (!active) return;
        setUser(result.user);
        await loadNotes(token);
      } catch {
        localStorage.removeItem('notes-token');
        if (active) {
          setToken('');
          setUser(null);
          setNotes([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    restoreSession();
    return () => { active = false; };
  }, [token, loadNotes]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await request(`/auth/${authMode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      localStorage.setItem('notes-token', result.token);
      setUser(result.user);
      setToken(result.token);
      setLoading(true);
      setAuthForm({ name: '', email: '', password: '' });
      await loadNotes(result.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('notes-token');
    setToken('');
    setUser(null);
    setNotes([]);
    setNoteForm(emptyNote);
    setEditingId(null);
    setError('');
  };

  const saveNote = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await request(editingId ? `/notes/${editingId}` : '/notes', {
        token,
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(noteForm)
      });
      setNoteForm(emptyNote);
      setEditingId(null);
      await loadNotes(token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const editNote = (note) => {
    setEditingId(note._id);
    setNoteForm({ topic: note.topic, status: note.status, notes: note.notes });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    setError('');
    try {
      await request(`/notes/${id}`, { token, method: 'DELETE' });
      await loadNotes(token);
      if (editingId === id) {
        setEditingId(null);
        setNoteForm(emptyNote);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (loading) return <main className="page"><p className="muted">Loading your notes…</p></main>;

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">N</div>
          <h1>Notes, kept simple.</h1>
          <p className="muted">Sign in to keep your notes in one place.</p>
          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError(''); }}>Log in</button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setError(''); }}>Sign up</button>
          </div>
          <form onSubmit={handleAuth} className="form-stack">
            {authMode === 'signup' && <label>Name<input required maxLength="80" autoComplete="name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>}
            <label>Email<input required type="email" autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label>Password<input required type="password" minLength="8" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Log in'}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="wordmark" href="/">notebook</a>
        <div className="account"><span>{user.name}</span><button className="quiet-button" onClick={signOut}>Log out</button></div>
      </header>
      <section className="content">
        <div className="intro"><p className="eyebrow">YOUR SPACE</p><h1>My notes</h1><p className="muted">Capture what you need to remember.</p></div>
        <section className="editor-card">
          <h2>{editingId ? 'Edit note' : 'Add a note'}</h2>
          <form onSubmit={saveNote} className="note-form">
            <label>Topic<input required maxLength="120" placeholder="Give this note a title" value={noteForm.topic} onChange={(event) => setNoteForm({ ...noteForm, topic: event.target.value })} /></label>
            <label>Status<select value={noteForm.status} onChange={(event) => setNoteForm({ ...noteForm, status: event.target.value })}><option>To do</option><option>In progress</option><option>Done</option></select></label>
            <label className="full-width">Note<textarea required maxLength="5000" rows="4" placeholder="Write something down…" value={noteForm.notes} onChange={(event) => setNoteForm({ ...noteForm, notes: event.target.value })} /></label>
            {error && <p className="error full-width" role="alert">{error}</p>}
            <div className="form-actions full-width">
              {editingId && <button type="button" className="quiet-button" onClick={() => { setEditingId(null); setNoteForm(emptyNote); setError(''); }}>Cancel</button>}
              <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save note'}</button>
            </div>
          </form>
        </section>
        <div className="notes-heading"><h2>All notes</h2><span>{notes.length}</span></div>
        {notes.length === 0 ? <section className="empty-state"><div>✦</div><h3>No notes yet</h3><p className="muted">Your notes will show up here after you add one.</p></section> : (
          <section className="notes-grid">
            {notes.map((note) => <article className="note-card" key={note._id}>
              <div className="note-card-top"><span className="status-pill">{note.status}</span><span className="note-date">{new Date(note.createdAt).toLocaleDateString()}</span></div>
              <h3>{note.topic}</h3><p className="note-body">{note.notes}</p>
              <div className="note-actions"><button className="quiet-button" onClick={() => editNote(note)}>Edit</button><button className="delete-button" onClick={() => deleteNote(note._id)}>Delete</button></div>
            </article>)}
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
