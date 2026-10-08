'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const nextMembers = Array.isArray(team?.members) ? team.members : [];
    const selected = nextMembers
      .map((member) => ({
        id: member?._id || member?.id || member?.userId || '',
        name: member?.name || '',
        email: member?.email || '',
        college: member?.college || ''
      }))
      .filter((member) => member.id && member.name && member.email);

    setMembers(selected);
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
    setSearch('');
    setResults([]);
  }, [team, user, domains]);

  const requiredMembers = useMemo(() => Number(form.size || 2) - 1, [form.size]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/participants/search?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.error || 'Participant search failed.');
        }
        if (active) {
          setResults(
            (Array.isArray(data) ? data : []).filter(
              (participant) =>
                participant.id !== user?._id &&
                participant.email !== user?.email &&
                !members.some((selected) => selected.id === participant.id)
            )
          );
        }
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [members, search, token, user]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const addMember = (participant) => {
    if (!participant?.id) return;
    if (members.some((member) => member.id === participant.id)) return;
    if (members.length >= requiredMembers) {
      setError(`Only ${requiredMembers} verified participant${requiredMembers === 1 ? '' : 's'} are needed for this team size.`);
      return;
    }
    if (participant.id === user?._id || participant.email === user?.email) {
      setError('You cannot add yourself as a team member.');
      return;
    }

    setMembers((current) => [...current, participant]);
    setSearch('');
    setResults([]);
    setError('');
  };

  const removeMember = (id) => {
    setMembers((current) => current.filter((member) => member.id !== id));
    setError('');
  };

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
      const memberIds = members.map((member) => member.id);
      if (memberIds.length !== requiredMembers) {
        throw new Error(`Select ${requiredMembers} verified participant${requiredMembers === 1 ? '' : 's'} for this team.`);
      }

      const editing = Boolean(team);
      const response = await fetch(editing ? '/api/me/team' : '/api/team', {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          size: Number(form.size),
          memberIds
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
        <p>{team ? 'Update your team details and verified participants.' : 'Choose a verified participant for each team spot and keep the roster real.'}</p>
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

      <div className="member-form-section">
        <div className="member-form-heading">
          <div>
            <p className="workspace-kicker">Verified participants</p>
            <h3>Team members</h3>
          </div>
          <span>
            {members.length}/{requiredMembers} selected
          </span>
        </div>

        <div className="participant-search">
          <label htmlFor="member-search">Add Team Member</label>
          <input
            id="member-search"
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search.trim().length >= 2 && (
            <div className="participant-search-results">
              {searching ? (
                <p className="muted-copy">Searching verified participants…</p>
              ) : results.length ? (
                results.map((participant) => (
                  <div className="participant-search-item" key={participant.id}>
                    <div>
                      <strong>{participant.name}</strong>
                      <p>{participant.email}</p>
                      {participant.college && <small>{participant.college}</small>}
                    </div>
                    <button type="button" className="panel-link" onClick={() => addMember(participant)}>
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted-copy">No verified participants match this search.</p>
              )}
            </div>
          )}
        </div>

        <div className="member-list">
          {members.length ? (
            members.map((member) => (
              <div className="member-chip" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </div>
                <button type="button" className="panel-link" onClick={() => removeMember(member.id)}>
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="muted-copy">No team members selected yet.</p>
          )}
        </div>
      </div>

      <label className="full-field file-field">
        College ID card <span className="field-hint">PNG, JPG, WEBP or PDF · under 1.5 MB</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={file} />
        <span className="file-note">{form.idFile ? 'File attached and ready to upload.' : team?.hasId ? 'ID card already attached. Choose a file to replace it.' : 'Optional, but useful for verification.'}</span>
      </label>

      {error && <p className="form-message error" role="alert">{error}</p>}

      <div className="team-form-actions">
        <button type="button" className="ui-button ui-button-ghost" onClick={onCancel}>Cancel</button>
        <Button type="submit" disabled={busy} icon="check">{busy ? 'Saving…' : team ? 'Save changes' : 'Register team'}</Button>
      </div>
    </form>
  );
}
