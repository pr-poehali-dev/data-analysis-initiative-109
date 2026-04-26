import { useState, useEffect, useRef } from "react";

// ========== ТИПЫ ==========
interface Stage {
  name: string;
  responsible: string;
  durationDays: number;
  tasks: string[];
  actualCost: number;
  plannedCost: number;
}

interface SupplyRequest {
  id: number;
  material: string;
  quantity: string;
  requiredDate: string;
  stageId: number;
  status: string;
  vendor: string;
  cost: number;
}

interface B24Task {
  id: number;
  title: string;
  assignee: string;
  status: string;
  priority: string;
  dueDate: string;
}

interface ChatMessage {
  senderRole: string;
  senderName: string;
  text: string;
  time: string;
}

interface ConstructionObject {
  id: number;
  name: string;
  stages: Stage[];
  taskCheck: boolean[][];
  finance: { contractAmount: number; paidAmount: number; additionalCosts: number };
  supplyRequests: SupplyRequest[];
  b24Tasks: B24Task[];
  chat: ChatMessage[];
}

// ========== КОНСТАНТЫ ==========
const ROLE_PASSWORDS: Record<string, string> = {
  admin: "admin2024",
  customer: "заказчик123",
  rp: "рп2024",
  foreman: "прораб2024",
  supply: "снабжение2024",
  accountant: "финансист2024",
};

const ROLE_NAMES: Record<string, string> = {
  admin: "Администратор",
  customer: "Заказчик",
  rp: "Руководитель проекта",
  foreman: "Прораб",
  supply: "Снабжение (Синтека)",
  accountant: "Финансист (ADesk)",
};

const DEFAULT_STAGES: Stage[] = [
  { name: "Организация площадки", responsible: "РП", durationDays: 2, tasks: ["Бытовка", "Туалет", "Складирование"], actualCost: 50000, plannedCost: 45000 },
  { name: "Геология и проект", responsible: "Геологи", durationDays: 14, tasks: ["Бурение", "Анализ грунта", "Проект"], actualCost: 120000, plannedCost: 100000 },
  { name: "Фундамент", responsible: "РП", durationDays: 15, tasks: ["Котлован", "Арматура", "Заливка"], actualCost: 450000, plannedCost: 420000 },
  { name: "Стены", responsible: "РП", durationDays: 20, tasks: ["Кладка", "Армопояс"], actualCost: 380000, plannedCost: 350000 },
  { name: "Кровля", responsible: "РП", durationDays: 14, tasks: ["Стропила", "Металлочерепица"], actualCost: 290000, plannedCost: 270000 },
  { name: "Окна и электрика", responsible: "РП", durationDays: 10, tasks: ["Окна", "Электропроводка"], actualCost: 210000, plannedCost: 200000 },
  { name: "Сантехника и фасад", responsible: "РП", durationDays: 12, tasks: ["Трубы", "Утепление фасада"], actualCost: 310000, plannedCost: 290000 },
];

function createNewObject(name: string): ConstructionObject {
  return {
    id: Date.now() + Math.random(),
    name,
    stages: JSON.parse(JSON.stringify(DEFAULT_STAGES)),
    taskCheck: DEFAULT_STAGES.map((s) => new Array(s.tasks.length).fill(false)),
    finance: { contractAmount: 2500000, paidAmount: 1000000, additionalCosts: 0 },
    supplyRequests: [
      { id: 1, material: "Бетон М300", quantity: "50 м³", requiredDate: "2025-02-01", stageId: 2, status: "approved", vendor: "БетонКом", cost: 250000 },
      { id: 2, material: "Арматура ⌀12", quantity: "5 т", requiredDate: "2025-01-25", stageId: 2, status: "new", vendor: "", cost: 180000 },
    ],
    b24Tasks: [
      { id: 1, title: "Согласовать смету", assignee: "РП", status: "done", priority: "high", dueDate: "2025-01-20" },
      { id: 2, title: "Закупить арматуру", assignee: "Снабжение", status: "in_progress", priority: "high", dueDate: "2025-01-25" },
    ],
    chat: [{ senderRole: "rp", senderName: "РП", text: "Проект запущен!", time: new Date().toLocaleString() }],
  };
}

const STORAGE_KEY = "globalStroiFinal";

function loadFromStorage(): { objects: ConstructionObject[]; currentObjectId: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.warn("Storage parse error", e); }
  const objs = [createNewObject("Коттедж Лесной"), createNewObject("ЖК Строитель")];
  return { objects: objs, currentObjectId: objs[0].id };
}

// ========== КОМПОНЕНТЫ ВКЛАДОК ==========

function WorkTab({ obj, role, onChange }: { obj: ConstructionObject; role: string; onChange: (o: ConstructionObject) => void }) {
  const total = obj.taskCheck.flat().length;
  const done = obj.taskCheck.flat().filter(Boolean).length;
  const percent = total ? Math.floor((done / total) * 100) : 0;

  const toggle = (si: number, ti: number, val: boolean) => {
    const updated = { ...obj, taskCheck: obj.taskCheck.map((row, i) => i === si ? row.map((v, j) => j === ti ? val : v) : row) };
    onChange(updated);
  };

  const canEdit = role !== "customer";

  return (
    <div>
      <div className="crm-stats-grid">
        <div className="crm-stat-card">
          <div className="crm-stat-value">{percent}%</div>
          <div>Общий прогресс</div>
        </div>
        <div className="crm-stat-card">
          <div className="crm-stat-value">{done}/{total}</div>
          <div>Выполнено задач</div>
        </div>
      </div>
      {obj.stages.map((s, i) => (
        <div className="crm-stage-card" key={i}>
          <div className="crm-stage-header">
            <strong>{i + 1}. {s.name}</strong>
            <span>{s.responsible} · {s.durationDays} дн.</span>
          </div>
          <div className="crm-task-list">
            {s.tasks.map((task, t) => (
              <div className="crm-task-item" key={t}>
                <input
                  type="checkbox"
                  className="crm-task-check"
                  checked={obj.taskCheck[i]?.[t] ?? false}
                  disabled={!canEdit}
                  onChange={(e) => toggle(i, t, e.target.checked)}
                />
                <span style={{ textDecoration: obj.taskCheck[i]?.[t] ? "line-through" : "none", color: obj.taskCheck[i]?.[t] ? "#64748b" : undefined }}>{task}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SupplyTab({ obj, role, onChange }: { obj: ConstructionObject; role: string; onChange: (o: ConstructionObject) => void }) {
  const canEdit = role === "supply" || role === "admin" || role === "rp";
  if (!canEdit) return <div className="crm-restricted">⛔ Доступно только снабжению или администратору</div>;

  const updateStatus = (id: number, status: string) => {
    onChange({ ...obj, supplyRequests: obj.supplyRequests.map((r) => r.id === id ? { ...r, status } : r) });
  };

  const addRequest = () => {
    const material = prompt("Материал");
    if (!material) return;
    const quantity = prompt("Количество") ?? "";
    const requiredDate = prompt("Дата") ?? "";
    const cost = parseInt(prompt("Стоимость") ?? "0") || 0;
    onChange({ ...obj, supplyRequests: [...obj.supplyRequests, { id: Date.now(), material, quantity, requiredDate, stageId: 0, status: "new", vendor: "", cost }] });
  };

  return (
    <div>
      <h3 className="crm-section-title">📦 Синтека — Управление снабжением</h3>
      <button className="crm-btn-primary" onClick={addRequest} style={{ margin: "16px 0" }}>➕ Новая заявка</button>
      {obj.supplyRequests.map((req) => (
        <div className="crm-stage-card" key={req.id}>
          <div className="crm-stage-header">
            <strong>{req.material}</strong> — {req.quantity}
          </div>
          <div className="crm-task-list">
            💰 {req.cost.toLocaleString()} ₽ | Поставщик: {req.vendor || "—"} | Статус: {req.status}
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select className="crm-select" defaultValue={req.status} onChange={(e) => updateStatus(req.id, e.target.value)}>
                <option value="new">Новая</option>
                <option value="in_progress">В работе</option>
                <option value="approved">Согласована</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceTab({ obj, role, onChange }: { obj: ConstructionObject; role: string; onChange: (o: ConstructionObject) => void }) {
  const canEdit = role === "accountant" || role === "admin" || role === "rp";
  const [contractInput, setContractInput] = useState(String(obj.finance.contractAmount));

  if (!canEdit) return <div className="crm-restricted">⛔ Доступно только финансисту или администратору</div>;
  const totalActual = obj.stages.reduce((sum, s) => sum + s.actualCost, 0);
  const profit = obj.finance.contractAmount - totalActual;

  return (
    <div>
      <h3 className="crm-section-title">📊 ADesk — Финансовый учёт</h3>
      <div className="crm-stats-grid">
        <div className="crm-stat-card"><div className="crm-stat-value">{obj.finance.contractAmount.toLocaleString()} ₽</div><div>Договор</div></div>
        <div className="crm-stat-card"><div className="crm-stat-value">{obj.finance.paidAmount.toLocaleString()} ₽</div><div>Оплачено</div></div>
        <div className="crm-stat-card"><div className="crm-stat-value" style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}>{profit.toLocaleString()} ₽</div><div>Прибыль</div></div>
      </div>
      <h4 style={{ marginBottom: 12, color: "#94a3b8" }}>Себестоимость по этапам</h4>
      {obj.stages.map((s, i) => (
        <div className="crm-task-item" key={i}>
          <strong>{i + 1}. {s.name}</strong> — план: {s.plannedCost.toLocaleString()} ₽ | факт: {s.actualCost.toLocaleString()} ₽
        </div>
      ))}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="crm-input"
          type="number"
          value={contractInput}
          onChange={(e) => setContractInput(e.target.value)}
          placeholder="Новая сумма договора"
        />
        <button className="crm-btn-primary" onClick={() => onChange({ ...obj, finance: { ...obj.finance, contractAmount: parseInt(contractInput) || 0 } })}>
          Обновить
        </button>
      </div>
    </div>
  );
}

function TasksTab({ obj, role, onChange }: { obj: ConstructionObject; role: string; onChange: (o: ConstructionObject) => void }) {
  const updateStatus = (id: number, status: string) => {
    onChange({ ...obj, b24Tasks: obj.b24Tasks.map((t) => t.id === id ? { ...t, status } : t) });
  };

  const addTask = () => {
    const title = prompt("Название задачи");
    if (!title) return;
    const assignee = prompt("Ответственный") ?? "";
    const priority = prompt("Приоритет (high/normal/low)") ?? "normal";
    const dueDate = prompt("Срок (ГГГГ-ММ-ДД)") ?? "";
    onChange({ ...obj, b24Tasks: [...obj.b24Tasks, { id: Date.now(), title, assignee, status: "open", priority, dueDate }] });
  };

  const canAdd = role === "rp" || role === "admin";

  return (
    <div>
      <h3 className="crm-section-title">✅ Битрикс24 — Задачи и поручения</h3>
      {canAdd && <button className="crm-btn-primary" onClick={addTask} style={{ margin: "16px 0" }}>+ Новая задача</button>}
      {obj.b24Tasks.map((task) => (
        <div className="crm-stage-card" key={task.id}>
          <div className="crm-stage-header">
            <strong>{task.title}</strong> — {task.status}
          </div>
          <div className="crm-task-list">
            👤 {task.assignee} | Приоритет: {task.priority} | Срок: {task.dueDate}
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select className="crm-select" defaultValue={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}>
                <option value="open">Открыта</option>
                <option value="in_progress">В работе</option>
                <option value="done">Выполнена</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardTab({ objects }: { objects: ConstructionObject[] }) {
  return (
    <div>
      <h3 className="crm-section-title">📈 Дашборд по объектам</h3>
      <div className="crm-stats-grid">
        {objects.map((obj) => {
          const total = obj.taskCheck.flat().length;
          const done = obj.taskCheck.flat().filter(Boolean).length;
          const percent = total ? Math.floor((done / total) * 100) : 0;
          return (
            <div className="crm-stat-card" key={obj.id}>
              <div className="crm-stat-value" style={{ fontSize: "1.2rem" }}>{obj.name}</div>
              <div>Прогресс: {percent}%</div>
              <div>💰 {obj.finance.contractAmount.toLocaleString()} ₽</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminTab({ objects, role, onUpdate }: { objects: ConstructionObject[]; role: string; onUpdate: (objs: ConstructionObject[]) => void }) {
  if (role !== "admin") return <div className="crm-restricted">⛔ Доступно только администратору</div>;

  const deleteObject = (id: number) => {
    onUpdate(objects.filter((o) => o.id !== id));
  };

  const createObject = () => {
    const name = prompt("Название объекта");
    if (name) onUpdate([...objects, createNewObject(name)]);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(objects, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "globalstroi_backup.json";
    a.click();
  };

  return (
    <div>
      <h3 className="crm-section-title">🛡️ Админ-панель</h3>
      {objects.map((obj) => (
        <div className="crm-task-item" style={{ justifyContent: "space-between" }} key={obj.id}>
          <span><strong>{obj.name}</strong></span>
          <button className="crm-btn-outline" onClick={() => deleteObject(obj.id)}>🗑️ Удалить</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button className="crm-btn-primary" onClick={createObject}>➕ Создать объект</button>
        <button className="crm-btn-outline" onClick={exportData}>📎 Экспорт JSON</button>
      </div>
    </div>
  );
}

// ========== АВТОРИЗАЦИЯ ==========
function LoginScreen({ onLogin }: { onLogin: (role: string) => void }) {
  const [selectedRole, setSelectedRole] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (ROLE_PASSWORDS[selectedRole] === password) {
      onLogin(selectedRole);
    } else {
      setError("Неверный пароль!");
    }
  };

  return (
    <div className="crm-login-overlay">
      <div className="crm-login-card">
        <h2 className="crm-gradient-text">🏗️ ГлобалСтрой PRO</h2>
        <p style={{ color: "#94a3b8", marginBottom: 8 }}>Вход в систему</p>
        <select className="crm-field" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
          <option value="admin">👑 Администратор</option>
          <option value="rp">👷 Руководитель проекта</option>
          <option value="foreman">🔨 Прораб</option>
          <option value="supply">📦 Снабжение (Синтека)</option>
          <option value="accountant">💰 Финансист (ADesk)</option>
          <option value="customer">🏠 Заказчик</option>
        </select>
        <input
          className="crm-field"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <button className="crm-login-btn" onClick={handleLogin}>Войти</button>
        {error && <div style={{ color: "#f87171", marginTop: 8 }}>{error}</div>}
        <hr style={{ margin: "16px 0", borderColor: "#334155" }} />
        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
          Тестовые пароли:<br />
          admin: admin2024 | рп: рп2024 | снабжение: снабжение2024 | финансист: финансист2024
        </div>
      </div>
    </div>
  );
}

// ========== ЧАТ ==========
function ChatSidebar({ obj, role, open, onClose, onChange }: { obj: ConstructionObject; role: string; open: boolean; onClose: () => void; onChange: (o: ConstructionObject) => void }) {
  const [text, setText] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [obj.chat, open]);

  const send = () => {
    if (!text.trim()) return;
    onChange({ ...obj, chat: [...obj.chat, { senderRole: role, senderName: ROLE_NAMES[role], text: text.trim(), time: new Date().toLocaleString() }] });
    setText("");
  };

  return (
    <div className={`crm-chat-sidebar ${open ? "open" : ""}`}>
      <div className="crm-chat-header">
        <strong>💬 Чат команды</strong>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
      </div>
      <div className="crm-chat-messages" ref={messagesRef}>
        {obj.chat.map((msg, i) => (
          <div key={i} className={`crm-message ${msg.senderRole === role ? "crm-message-mine" : "crm-message-other"}`}>
            <div style={{ fontSize: "0.7rem", marginBottom: 4, opacity: 0.7 }}><strong>{msg.senderName}</strong> {msg.time}</div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>
      <div className="crm-chat-input-area">
        <textarea
          className="crm-chat-input"
          rows={1}
          placeholder="Сообщение..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="crm-btn-primary" onClick={send} style={{ padding: "10px 18px" }}>➤</button>
      </div>
    </div>
  );
}

// ========== ГЛАВНЫЙ КОМПОНЕНТ ==========
export default function Index() {
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<{ objects: ConstructionObject[]; currentObjectId: number } | null>(null);
  const [activeTab, setActiveTab] = useState("work");
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    if (role) setData(loadFromStorage());
  }, [role]);

  const save = (objects: ConstructionObject[], currentObjectId: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ objects, currentObjectId }));
  };

  const updateObject = (updated: ConstructionObject) => {
    if (!data) return;
    const objects = data.objects.map((o) => o.id === updated.id ? updated : o);
    save(objects, data.currentObjectId);
    setData({ ...data, objects });
  };

  const updateObjects = (objects: ConstructionObject[]) => {
    if (!data) return;
    const newId = objects.find((o) => o.id === data.currentObjectId) ? data.currentObjectId : objects[0]?.id;
    save(objects, newId);
    setData({ objects, currentObjectId: newId });
  };

  const logout = () => {
    setRole(null);
    setData(null);
  };

  if (!role) return <LoginScreen onLogin={setRole} />;
  if (!data) return <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e2e8f0" }}>Загрузка...</div>;

  const currentObj = data.objects.find((o) => o.id === data.currentObjectId) ?? data.objects[0];

  const NAV_ITEMS = [
    { id: "work", label: "🏗️ Стройка (Гектаро)" },
    { id: "supply", label: "📦 Снабжение (Синтека)" },
    { id: "finance", label: "📊 Финансы (ADesk)" },
    { id: "tasks", label: "✅ Задачи (Битрикс24)" },
    { id: "dashboard", label: "📈 Дашборд" },
    { id: "admin", label: "🛡️ Админ-панель" },
  ];

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex" }}>
        {/* Оверлей для мобильного */}
        {mobileSidebar && (
          <div onClick={() => setMobileSidebar(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }} />
        )}

        {/* САЙДБАР */}
        <div className={`crm-sidebar ${mobileSidebar ? "crm-sidebar-open" : ""}`}>
          <div className="crm-sidebar-header">
            <div className="crm-gradient-text" style={{ fontSize: "1.3rem", fontWeight: 700 }}>🏗️ ГлобалСтрой PRO</div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>ADesk | Гектаро | Синтека | Битрикс24</div>
          </div>
          <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <div
                key={item.id}
                className={`crm-nav-item ${activeTab === item.id ? "crm-nav-active" : ""}`}
                onClick={() => { setActiveTab(item.id); setMobileSidebar(false); }}
              >
                {item.label}
              </div>
            ))}
          </div>
          <div className="crm-sidebar-footer">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="crm-user-avatar">👤</div>
              <span style={{ fontSize: "0.85rem" }}>{ROLE_NAMES[role]}</span>
            </div>
            <button className="crm-logout-btn" onClick={logout}>Выйти</button>
          </div>
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ */}
        <div className="crm-main-content">
          {/* Мобильная шапка */}
          <div className="crm-mobile-header">
            <button onClick={() => setMobileSidebar(true)} style={{ background: "none", border: "none", color: "#e2e8f0", fontSize: "1.3rem", cursor: "pointer" }}>☰</button>
            <span className="crm-gradient-text" style={{ fontWeight: 700 }}>ГлобалСтрой PRO</span>
          </div>

          {/* Объекты */}
          <div className="crm-objects-bar">
            {data.objects.map((obj) => (
              <button
                key={obj.id}
                className={`crm-object-btn ${obj.id === data.currentObjectId ? "crm-object-btn-active" : ""}`}
                onClick={() => { save(data.objects, obj.id); setData({ ...data, currentObjectId: obj.id }); }}
              >
                {obj.name}
              </button>
            ))}
          </div>

          {/* Вкладки */}
          <div className="crm-glass-card">
            {activeTab === "work" && <WorkTab obj={currentObj} role={role} onChange={updateObject} />}
            {activeTab === "supply" && <SupplyTab obj={currentObj} role={role} onChange={updateObject} />}
            {activeTab === "finance" && <FinanceTab obj={currentObj} role={role} onChange={updateObject} />}
            {activeTab === "tasks" && <TasksTab obj={currentObj} role={role} onChange={updateObject} />}
            {activeTab === "dashboard" && <DashboardTab objects={data.objects} />}
            {activeTab === "admin" && <AdminTab objects={data.objects} role={role} onUpdate={updateObjects} />}
          </div>
        </div>
      </div>

      {/* ЧАТ */}
      <div className="crm-toggle-chat-btn" onClick={() => setChatOpen(true)}>💬</div>
      <ChatSidebar
        obj={currentObj}
        role={role}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onChange={updateObject}
      />
    </div>
  );
}