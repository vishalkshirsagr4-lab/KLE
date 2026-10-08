'use client';

import { useEffect, useState } from 'react';
import Button from '../ui/Button';

const empty = (name = '', domain = '') => ({
  team: '',
  size: 2,
  college: 'KLE BCA College, Mahalingpur',
  idn: '',
  domain: domain || '',
  ps: '',
  ln: name || '',
  idFile: ''
});

export default function ParticipantTeamForm({ token, user, team, domains, onSaved, onCancel }) {
  const [form, setForm] = useState(empty(user?.name, domains[0]?.name));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      team: team?.name || '',
      size: team?.size || 2,
      college: team?.college || '',
      idn: team?.idNumber || '',
      domain: team?.domain || domains[0]?.name || '',
      ps: team?.problemStatement || '',
      ln: team?.leader?.name || user?.name || '',
      idFile: ''
    });
  }, [team, user, domains]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const file = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = () => update('idFile', reader.result);
    reader.readAsDataURL(selected);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const editing = Boolean(team);
      const response = await fetch(editing ? '/api/me/team' : '/api/team', {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          ...form,
          size: Number(form.size)
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save your team.');
      onSaved(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="team-form" onSubmit={submit}>
      <div className="form-section-intro">
        <p className="workspace-kicker">{team ? 'Edit registration' : 'Register your team'}</p>
        <h2>{team ? 'Keep your details current.' : 'Give your build a home.'}</h2>
        <p>{team ? 'Update your team details and invite members using the verified invitation flow.' : 'Create your team profile and invite verified participants to join through the approval-based flow.'}</p>
      </div>

      <div className="team-form-grid">
        <label>
          Team name
          <input value={form.team} onChange={(event) => update('team', event.target.value)} maxLength={80} required />
        </label>

        <label>
          Team size
          <select value={form.size} onChange={(event) => update('size', Number(event.target.value))}>
            <option value={2}>2 members</option>
            <option value={3}>3 members</option>
            <option value={4}>4 members</option>
          </select>
        </label>

        <label>
          College
          <input value={form.college} onChange={(event) => update('college', event.target.value)} maxLength={120} required />
        </label>

        <label>
          Student ID / ID number
          <input value={form.idn} onChange={(event) => update('idn', event.target.value)} maxLength={60} required />
        </label>

        <label>
          Track
          <select value={form.domain} onChange={(event) => update('domain', event.target.value)} required>
            <option value="" disabled>Select a track</option>
            {domains.map((item) => (
              <option key={item._id || item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
        </label>

        <label>
          Team leader
          <input value={form.ln} onChange={(event) => update('ln', event.target.value)} maxLength={80} required />
        </label>
      </div>

      <label className="full-field">
        Problem statement <span className="field-hint">At least 50 characters</span>
        <textarea value={form.ps} onChange={(event) => update('ps', event.target.value)} minLength={50} maxLength={3000} rows={5} required />
      </label>

      <label className="full-field file-field">
        College ID card <span className="field-hint">PNG, JPG, WEBP or PDF ? under 1.5 MB</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={file} />
        <span className="file-note">{form.idFile ? 'File attached and ready to upload.' : team?.hasId ? 'ID card already attached. Choose a file to replace it.' : 'Optional, but useful for verification.'}</span>
      </label>

      {error && <p className="form-message error" role="alert">{error}</p>}

      <div className="team-form-actions">
        <button type="button" className="ui-button ui-button-ghost" onClick={onCancel}>Cancel</button>
        <Button type="submit" disabled={busy} icon="check">{busy ? 'Saving?' : team ? 'Save changes' : 'Register team'}</Button>
      </div>
    </form>
  );
}
