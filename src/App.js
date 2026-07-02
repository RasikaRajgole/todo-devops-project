import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const CATEGORIES = ['Personal', 'Work', 'Shopping', 'Health', 'Study', 'Other'];

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(val)), [key, val]);
  return [val, setVal];
}

// ── Glitter canvas ──────────────────────────────────────────────────────────
function GlitterCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 120 }, () => makeParticle(W, H));

    function makeParticle(w, h, x) {
      const colors = ['#f093fb','#f5576c','#fda085','#f6d365','#a78bfa','#38bdf8','#4ade80','#fff'];
      return {
        x: x ?? Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.4 + 0.1,
        drift: (Math.random() - 0.5) * 0.3,
        twinkle: Math.random() * 0.02 + 0.005,
        dir: Math.random() > 0.5 ? 1 : -1,
      };
    }

    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p, i) => {
        p.alpha += p.twinkle * p.dir;
        if (p.alpha >= 0.9 || p.alpha <= 0.1) p.dir *= -1;
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -5) { particles[i] = makeParticle(W, H, Math.random() * W); particles[i].y = H + 5; }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas id="glitter-canvas" ref={canvasRef} />;
}

// ── Due date helper ─────────────────────────────────────────────────────────
function dueDateStatus(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dateStr);
  const diff = Math.ceil((due - today) / 86400000);
  if (diff < 0)  return { label: `Overdue ${Math.abs(diff)}d`, cls: 'overdue' };
  if (diff === 0) return { label: 'Due Today', cls: 'soon' };
  if (diff <= 3)  return { label: `Due in ${diff}d`, cls: 'soon' };
  return { label: `Due ${due.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`, cls: '' };
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [todos, setTodos] = useLocalStorage('todos_v2', []);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('Personal');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  const addTodo = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setTodos(prev => [{
      id: Date.now(), text, priority, category,
      dueDate, completed: false, createdAt: Date.now(),
    }, ...prev]);
    setInput('');
    setDueDate('');
  }, [input, priority, category, dueDate, setTodos]);

  const toggle   = id => setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const remove   = id => setTodos(p => p.filter(t => t.id !== id));
  const clearDone = () => setTodos(p => p.filter(t => !t.completed));

  const saveEdit = id => {
    const text = editText.trim();
    if (text) setTodos(p => p.map(t => t.id === id ? { ...t, text } : t));
    setEditId(null);
  };

  // filter → search → sort
  let visible = todos.filter(t => {
    if (filter === 'active')    return !t.completed;
    if (filter === 'completed') return t.completed;
    if (filter === 'overdue')   return !t.completed && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return t.dueDate === today;
    }
    return true;
  });

  if (search.trim()) {
    const q = search.toLowerCase();
    visible = visible.filter(t => t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }

  visible = [...visible].sort((a, b) => {
    if (sortBy === 'newest')   return b.createdAt - a.createdAt;
    if (sortBy === 'oldest')   return a.createdAt - b.createdAt;
    if (sortBy === 'priority') {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  });

  const total     = todos.length;
  const doneCount = todos.filter(t => t.completed).length;
  const activeCount = total - doneCount;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <>
      <GlitterCanvas />
      <div className="app">

        {/* Header */}
        <div className="app-header">
          <h1>✨ TaskFlow</h1>
          <p>Your magical productivity companion</p>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card total">
            <span className="stat-num">{total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card active">
            <span className="stat-num">{activeCount}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card done">
            <span className="stat-num">{doneCount}</span>
            <span className="stat-label">Done</span>
          </div>
        </div>

        {/* Progress */}
        <div className="progress-wrap">
          <div className="progress-label">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Input */}
        <div className="input-section">
          <div className="input-row">
            <input
              type="text"
              placeholder="Add a new task..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
            />
            <button className="btn-add" onClick={addTodo}>+</button>
          </div>
          <div className="options-row">
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              value={dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="filters">
          {[
            { key: 'all', label: '📋 All' },
            { key: 'active', label: '⚡ Active' },
            { key: 'completed', label: '✅ Done' },
            { key: 'today', label: '📅 Today' },
            { key: 'overdue', label: '🔥 Overdue' },
          ].map(f => (
            <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="sort-bar">
          <label>Sort by:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">⬇ Newest</option>
            <option value="oldest">⬆ Oldest</option>
            <option value="priority">🔴 Priority</option>
            <option value="dueDate">📅 Due Date</option>
          </select>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✨</div>
            <p>No tasks found. {filter === 'all' && !search ? 'Add your first task above!' : 'Try a different filter.'}</p>
          </div>
        ) : (
          <ul className="todo-list">
            {visible.map(todo => {
              const ds = dueDateStatus(todo.dueDate);
              return (
                <li key={todo.id} className={`todo-item ${todo.priority} ${todo.completed ? 'completed' : ''}`}>
                  <div className={`check-box ${todo.completed ? 'checked' : ''}`} onClick={() => toggle(todo.id)} />

                  <div className="todo-content">
                    {editId === todo.id ? (
                      <input
                        className="edit-input"
                        value={editText}
                        autoFocus
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(todo.id); if (e.key === 'Escape') setEditId(null); }}
                        onBlur={() => saveEdit(todo.id)}
                      />
                    ) : (
                      <span className="todo-text">{todo.text}</span>
                    )}
                    <div className="todo-meta">
                      <span className={`priority-badge ${todo.priority}`}>{todo.priority}</span>
                      <span className="category-badge">{todo.category}</span>
                      {ds && <span className={`due-date ${ds.cls}`}>📅 {ds.label}</span>}
                    </div>
                  </div>

                  <div className="todo-actions">
                    <button className="btn-icon btn-edit" onClick={() => { setEditId(todo.id); setEditText(todo.text); }} title="Edit">✏️</button>
                    <button className="btn-icon btn-delete" onClick={() => remove(todo.id)} title="Delete">🗑️</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer */}
        <div className="footer">
          <span>{activeCount} task{activeCount !== 1 ? 's' : ''} remaining</span>
          {doneCount > 0 && (
            <button className="btn-clear" onClick={clearDone}>🧹 Clear completed</button>
          )}
        </div>

      </div>
    </>
  );
}
