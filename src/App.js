import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const FILTERS = ["All", "Active", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];
const CATEGORIES = ["Personal", "Work", "Shopping", "Health", "Other"];
const PRIORITY_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };

function Confetti({ active }) {
  const pieces = Array.from({ length: 40 });
  if (!active) return null;
  return (
    <div className="confetti-wrap" aria-hidden>
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: ["#667eea","#f59e0b","#22c55e","#ef4444","#a78bfa","#38bdf8"][i % 6],
            animationDelay: `${Math.random() * 0.6}s`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
          }}
        />
      ))}
    </div>
  );
}

function ProgressBar({ todos }) {
  const total = todos.length;
  const done = todos.filter((t) => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress-wrap">
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">{pct}% complete — {done}/{total} tasks</span>
    </div>
  );
}

export default function App() {
  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("todos_v2")) || []; } catch { return []; }
  });
  const [dark, setDark] = useState(() => localStorage.getItem("dark") === "true");
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("Personal");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState(null);
  const dragItem = useRef(null);
  const dragOver = useRef(null);
  const prevDoneCount = useRef(todos.filter((t) => t.done).length);

  useEffect(() => {
    localStorage.setItem("todos_v2", JSON.stringify(todos));
    const doneCount = todos.filter((t) => t.done).length;
    if (todos.length > 0 && doneCount === todos.length && doneCount > prevDoneCount.current) {
      setConfetti(true);
      showToast("🎉 All tasks completed!");
      setTimeout(() => setConfetti(false), 2800);
    }
    prevDoneCount.current = doneCount;
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("dark", dark);
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos([
      ...todos,
      { id: Date.now(), text, done: false, priority, category, dueDate, createdAt: Date.now() },
    ]);
    setInput("");
    setDueDate("");
    showToast("✅ Task added!");
  };

  const toggleTodo = (id) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTodo = (id) => {
    setTodos(todos.filter((t) => t.id !== id));
    showToast("🗑️ Task deleted");
  };

  const saveEdit = (id) => {
    const text = editText.trim();
    if (text) setTodos(todos.map((t) => (t.id === id ? { ...t, text } : t)));
    setEditId(null);
  };

  const clearCompleted = () => {
    setTodos(todos.filter((t) => !t.done));
    showToast("🧹 Cleared completed tasks");
  };

  const handleDragStart = (i) => { dragItem.current = i; };
  const handleDragEnter = (i) => { dragOver.current = i; };
  const handleDragEnd = () => {
    const list = [...todos];
    const dragged = list.splice(dragItem.current, 1)[0];
    list.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    setTodos(list);
  };

  const isOverdue = (t) => t.dueDate && !t.done && new Date(t.dueDate) < new Date(new Date().toDateString());

  const visible = todos
    .filter((t) => {
      if (filter === "Active" && t.done) return false;
      if (filter === "Completed" && !t.done) return false;
      if (catFilter !== "All" && t.category !== catFilter) return false;
      if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const po = { High: 0, Medium: 1, Low: 2 };
      return po[a.priority] - po[b.priority];
    });

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div className={`app${dark ? " dark" : ""}`}>
      <Confetti active={confetti} />
      {toast && <div className="toast">{toast}</div>}

      <div className="card">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <span className="app-icon">🚀</span>
            <div>
              <h1 className="title">TaskFlow</h1>
              <p className="subtitle">Stay focused, get things done</p>
            </div>
          </div>
          <button className="dark-toggle" onClick={() => setDark(!dark)} title="Toggle dark mode">
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Progress */}
        <ProgressBar todos={todos} />

        {/* Input */}
        <div className="input-section">
          <div className="input-row">
            <input
              className="main-input"
              placeholder="What needs to be done?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
            />
            <button className="add-btn" onClick={addTodo}>+ Add</button>
          </div>
          <div className="meta-row">
            <select className="meta-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select className="meta-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              type="date"
              className="meta-select date-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Search */}
        <div className="search-row">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="clear-search" onClick={() => setSearch("")}>✕</button>}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f}
                <span className="filter-count">
                  {f === "All" ? todos.length : f === "Active" ? todos.filter(t => !t.done).length : todos.filter(t => t.done).length}
                </span>
              </button>
            ))}
          </div>
          <select className="meta-select cat-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Todo List */}
        <ul className="todo-list">
          {visible.length === 0 && (
            <li className="empty">
              <span className="empty-icon">{search ? "🔍" : "🎯"}</span>
              <p>{search ? "No tasks match your search" : "No tasks here — add one above!"}</p>
            </li>
          )}
          {visible.map((todo, index) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.done ? "done" : ""} ${isOverdue(todo) ? "overdue" : ""}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className="drag-handle" title="Drag to reorder">⠿</span>

              <button
                className={`custom-check ${todo.done ? "checked" : ""}`}
                onClick={() => toggleTodo(todo.id)}
                aria-label="Toggle complete"
              >
                {todo.done && "✓"}
              </button>

              <div className="todo-body">
                {editId === todo.id ? (
                  <input
                    className="edit-input"
                    value={editText}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(todo.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    onBlur={() => saveEdit(todo.id)}
                  />
                ) : (
                  <span className="todo-text" onDoubleClick={() => { setEditId(todo.id); setEditText(todo.text); }}>
                    {todo.text}
                  </span>
                )}
                <div className="todo-meta">
                  <span className="priority-badge" style={{ background: PRIORITY_COLOR[todo.priority] + "22", color: PRIORITY_COLOR[todo.priority], borderColor: PRIORITY_COLOR[todo.priority] + "44" }}>
                    {todo.priority}
                  </span>
                  <span className="cat-badge">{todo.category}</span>
                  {todo.dueDate && (
                    <span className={`due-badge ${isOverdue(todo) ? "overdue-badge" : ""}`}>
                      📅 {isOverdue(todo) ? "Overdue · " : ""}{todo.dueDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="actions">
                <button className="icon-btn" title="Edit" onClick={() => { setEditId(todo.id); setEditText(todo.text); }}>✏️</button>
                <button className="icon-btn del" title="Delete" onClick={() => deleteTodo(todo.id)}>🗑️</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="footer">
            <span>{remaining} task{remaining !== 1 ? "s" : ""} remaining</span>
            <div className="footer-actions">
              {todos.some((t) => t.done) && (
                <button className="clear-btn" onClick={clearCompleted}>Clear completed</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
