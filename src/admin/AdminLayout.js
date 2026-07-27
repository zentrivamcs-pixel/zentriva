import React, { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import '../styles/tailwind.css';
import AdminSideNav from './AdminSideNav';
import AdminTopNav from './AdminTopNav';
import { AdminViewModal, AdminEditModal, AdminPaymentModal } from './AdminModals';
import { EDIT_FIELDS } from './adminHelpers';
import { adminApi } from '../shared/api';

// Fetches the member list and the inbox once and shares them (plus CRUD
// handlers and the view/edit modals) with every admin page via Outlet
// context, so switching between Dashboard and Members doesn't re-fetch or
// lose in-flight state.
function AdminLayout({ onLogout }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inbound support mail (contact form + Resend inbound), loaded here so the
  // Dashboard and the sidebar's unread count see the same list the Inbox
  // page does.
  const [messages, setMessages] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState('');

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Mobile: the sidebar becomes a slide-in drawer toggled from the top nav.
  const [navOpen, setNavOpen] = useState(false);

  // An expired/invalid token means every call will 401 — drop back to login.
  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      onLogout();
      return true;
    }
    return false;
  }, [onLogout]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('/api/members');
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
      if (!handleAuthError(error)) alert('Error loading data from database');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // A failure here is surfaced (inboxError), never swallowed — an empty
  // inbox and an inbox that failed to load look identical otherwise, which
  // is exactly how missing mail goes unnoticed.
  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    setInboxError('');
    try {
      const data = await adminApi('/api/inbox/list');
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading inbox:', error);
      if (!handleAuthError(error)) {
        setInboxError(error.message || 'Could not load messages.');
      }
    } finally {
      setInboxLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const markMessageRead = useCallback(async (message, read = true) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: read } : m)));
    try {
      await adminApi('/api/inbox/mark-read', {
        method: 'POST',
        body: JSON.stringify({ id: message.id, read }),
      });
    } catch (error) {
      console.error('Error marking message read:', error);
      // Put the row back the way it was — the server disagreed.
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: !read } : m)));
      handleAuthError(error);
    }
  }, [handleAuthError]);

  // Stopgap password reset: clears the member's portal password so they can
  // re-activate with their email + payment reference (or a reset email).
  const handleResetAccount = async (member) => {
    if (!window.confirm(
      `Reset ${member.full_name}'s portal account?\n\nTheir password will be removed and they will be signed out everywhere. ` +
      'They can re-activate on the portal login page using their email and payment reference.'
    )) return;
    try {
      const updated = await adminApi(`/api/members/${member.id}/reset`, { method: 'POST' });
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setViewing((prev) => (prev && prev.id === updated.id ? updated : prev));
      alert(`${member.full_name}'s portal account has been reset.`);
    } catch (error) {
      console.error('Error resetting account:', error);
      if (!handleAuthError(error)) alert('Failed to reset the account');
    }
  };

  // Approves or rejects a pending bank-transfer registration's payment
  // proof. Approving unblocks the member's portal login.
  const handlePaymentDecision = async (member, decision) => {
    const verb = decision === 'approve' ? 'Approve' : 'Reject';
    if (!window.confirm(`${verb} ${member.full_name}'s payment?`)) return;
    try {
      const updated = await adminApi(`/api/members/${member.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setViewing((prev) => (prev && prev.id === updated.id ? updated : prev));
    } catch (error) {
      console.error('Error updating payment status:', error);
      if (!handleAuthError(error)) alert(`Failed to ${decision} the payment`);
    }
  };

  // Hand-edit of the payment record (status / method / reference). Unlike
  // the approve/reject decision above, this sends the member no email.
  const openPaymentEdit = (member) => {
    setViewing(null);
    setPaymentError('');
    setEditingPayment(member);
  };

  const handlePaymentSave = async (fields) => {
    setPaymentSaving(true);
    setPaymentError('');
    try {
      const updated = await adminApi(`/api/members/${editingPayment.id}/payment`, {
        method: 'POST',
        body: JSON.stringify(fields),
      });
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingPayment(null);
    } catch (error) {
      console.error('Error updating payment details:', error);
      if (!handleAuthError(error)) {
        setPaymentError(error.message || 'Failed to save the payment details');
      }
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.full_name}? This cannot be undone.`)) return;
    try {
      await adminApi(`/api/members/${member.id}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (error) {
      console.error('Error deleting member:', error);
      if (!handleAuthError(error)) alert('Failed to delete member');
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
      const updated = await adminApi(`/api/members/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
    } catch (error) {
      console.error('Error updating member:', error);
      if (!handleAuthError(error)) alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-portal bg-background text-on-background min-h-screen">
      <AdminSideNav
        onLogout={onLogout}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        unreadCount={messages.filter((m) => !m.is_read).length}
      />

      <div className="md:ml-64">
        <AdminTopNav onMenuToggle={() => setNavOpen((open) => !open)} />
        <main className="p-margin-mobile md:p-margin-desktop space-y-gutter">
          <Outlet
            context={{
              members, loading, reload: loadMembers,
              setViewing, openEdit, handleDelete, handleResetAccount,
              handlePaymentDecision, openPaymentEdit,
              messages, inboxLoading, inboxError, reloadInbox: loadInbox, markMessageRead,
            }}
          />
        </main>
      </div>

      {viewing && (
        <AdminViewModal
          member={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
          onResetAccount={() => handleResetAccount(viewing)}
          onApprovePayment={() => handlePaymentDecision(viewing, 'approve')}
          onRejectPayment={() => handlePaymentDecision(viewing, 'reject')}
          onEditPayment={() => openPaymentEdit(viewing)}
        />
      )}
      {editingPayment && (
        <AdminPaymentModal
          member={editingPayment}
          saving={paymentSaving}
          error={paymentError}
          onSave={handlePaymentSave}
          onClose={() => setEditingPayment(null)}
        />
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
