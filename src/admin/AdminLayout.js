import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import '../styles/tailwind.css';
import AdminSideNav from './AdminSideNav';
import AdminTopNav from './AdminTopNav';
import { AdminViewModal, AdminEditModal } from './AdminModals';
import { EDIT_FIELDS } from './adminHelpers';

// Fetches the member list once and shares it (plus CRUD handlers and the
// view/edit modals) with every admin page via Outlet context, so switching
// between Dashboard and Members doesn't re-fetch or lose in-flight state.
function AdminLayout({ onLogout }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
      alert('Error loading data from database');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.full_name}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    }
  };

  const openEdit = (member) => {
    setViewing(null);
    setEditing(member);
    const form = {};
    EDIT_FIELDS.forEach(({ name, type }) => {
      form[name] = type === 'array' ? (member[name] || []).join(', ') : (member[name] ?? '');
    });
    setEditForm(form);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editing };
      EDIT_FIELDS.forEach(({ name, type }) => {
        payload[name] = type === 'array'
          ? editForm[name].split(',').map((s) => s.trim()).filter(Boolean)
          : editForm[name];
      });
      const response = await fetch(`/api/members/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated = await response.json();
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-portal bg-background text-on-background min-h-screen">
      <AdminSideNav onLogout={onLogout} />

      <div className="md:ml-64">
        <AdminTopNav />
        <main className="p-margin-mobile md:p-margin-desktop space-y-gutter">
          <Outlet context={{ members, loading, reload: loadMembers, setViewing, openEdit, handleDelete }} />
        </main>
      </div>

      {viewing && (
        <AdminViewModal member={viewing} onClose={() => setViewing(null)} onEdit={() => openEdit(viewing)} />
      )}
      {editing && (
        <AdminEditModal
          editForm={editForm}
          saving={saving}
          onChange={handleEditChange}
          onSubmit={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default AdminLayout;
