import React, { useMemo, useState } from 'react';

const CORE_FIELDS = [
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Investigating', 'Review', 'Approved', 'Closed'] },
  { key: 'owner', label: 'Owner' },
  { key: 'risk', label: 'Risk', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'amount', label: 'Amount', type: 'number' },
];

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function RecordDialog({ title, module, item, request, onClose, onChanged, children }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({ ...item });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fields = useMemo(() => [...CORE_FIELDS, ...module.columns.map(column => ({
    key: column.dbKey,
    label: column.label,
    type: column.type || (column.dbKey.toLowerCase().includes('date') ? 'date' : 'text'),
    options: column.options || [],
  }))], [module]);

  async function save() {
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/operation-records/' + item.id, {
        method: 'PUT',
        body: JSON.stringify({ moduleId: module.id, values: draft }),
      });
      await onChanged(result.message || 'Record updated');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/operation-records/' + item.id, {
        method: 'DELETE',
        body: JSON.stringify({ moduleId: module.id }),
      });
      await onChanged(result.message || 'Record deleted');
    } catch (failure) {
      setError(failure.message);
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return <div className="modalBackdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="modal recordEditor" role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span className="eyebrow">{editing ? 'Edit PostgreSQL record' : 'Record details'}</span><h3>{title}</h3></div><button className="ghost" onClick={onClose}>Close</button></header>
      <div className="modalBody">
        {editing ? <div className="formGrid">
          {fields.map(field => <label key={field.key}><span>{field.label}</span>
            {field.type === 'select' ? <select className="input" value={draft[field.key] ?? ''} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))}>{field.options.map(option => <option key={option}>{option}</option>)}</select>
              : <input className="input" type={field.type || 'text'} value={field.type === 'date' ? String(draft[field.key] || '').slice(0, 10) : (draft[field.key] ?? '')} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))}/>}
          </label>)}
        </div> : <div className="detailGrid">{Object.entries(item).filter(([, value]) => value !== null && value !== undefined).map(([key, value]) => <div className="detail" key={key}><small>{key.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())}</small><strong>{displayValue(value)}</strong></div>)}</div>}
        {!editing ? children : null}
        {error ? <div className="error">{error}</div> : null}
        {confirmDelete ? <div className="deleteConfirm"><strong>Delete this record permanently?</strong><div className="buttonRow"><button className="danger" disabled={busy} onClick={remove}>Delete now</button><button className="secondary" onClick={() => setConfirmDelete(false)}>Cancel</button></div></div> : null}
        <div className="buttonRow recordEditorActions">
          <button className="primary" disabled={busy} onClick={() => editing ? save() : setEditing(true)}>{editing ? 'Save changes' : 'Edit'}</button>
          <button className="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</button>
          <button className="secondary" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  </div>;
}

