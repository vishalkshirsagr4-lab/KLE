'use client';

import { useEffect, useState } from 'react';

export default function TeamInvitationPanel({ token, user, team, invitations, onUpdated }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (selectedParticipant || query.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      setSearchError('');
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/participants/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not search participants.');
        setSuggestions(data);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setSuggestions([]);
          setSearchError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedParticipant, token]);

  const request = async (path, method, body) => {
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  };

  const invite = async (event) => {
    event.preventDefault();
    if (!selectedParticipant) {
      setError('Search for and select a participant before sending the invitation.');
      return;
    }
    setBusy('invite');
    setError('');
    setNotice('');
    try {
      await request('/api/team/invite', 'POST', { email: selectedParticipant.email });
      setQuery('');
      setSelectedParticipant(null);
      setSuggestions([]);
      setNotice('Invitation sent. The participant must accept it before joining your team.');
      await onUpdated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const respond = async (id, decision) => {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      await request(`/api/team/invitations/${id}/${decision}`, 'POST');
      setNotice(decision === 'accept' ? 'Invitation accepted. You have joined the team.' : 'Invitation rejected.');
      await onUpdated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const received = invitations.received || [];
  const sent = invitations.sent || [];
  const pendingForTeam = sent.filter((item) =>
    item.status === 'pending' && String(item.team?.id) === String(team?._id)
  ).length;
  const slotsAvailable = team ? team.size - 1 - (team.members || []).length - pendingForTeam : 0;
  const isLeader = Boolean(team && user && String(team.leaderId) === String(user._id));

  return (
    <section className="workspace-panel team-invitations">
      <div className="panel-heading">
        <div>
          <p className="workspace-kicker">Team access</p>
          <h2>Invitations</h2>
        </div>
      </div>

      {error && <p className="form-message error" role="alert">{error}</p>}
      {notice && <p className="form-message success" role="status">{notice}</p>}

      {isLeader && (
        <form className="team-invite-form" onSubmit={invite}>
          <p>Search by name or email, select the right participant, then send the invitation. They join only after accepting.</p>
          <div className="team-invite-controls">
            <div className="team-invite-picker">
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedParticipant(null);
                  setError('');
                }}
                placeholder="Enter participant name or email"
                aria-label="Search participants by name or email"
                aria-autocomplete="list"
                aria-expanded={suggestions.length > 0}
                disabled={slotsAvailable <= 0}
              />
              {selectedParticipant && (
                <div className="team-invite-selected" role="status">
                  <strong>{selectedParticipant.name}</strong>
                  <span>{selectedParticipant.email}</span>
                  <button type="button" onClick={() => { setSelectedParticipant(null); setQuery(''); }}>Change</button>
                </div>
              )}
              {!selectedParticipant && query.trim().length >= 2 && (
                <div className="team-invite-suggestions" role="listbox" aria-label="Participant recommendations">
                  {searching && <p>Searching participants…</p>}
                  {!searching && searchError && <p className="is-error">{searchError}</p>}
                  {!searching && !searchError && suggestions.map((participant) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      key={participant.id}
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setQuery(participant.name);
                        setSuggestions([]);
                        setError('');
                      }}
                    >
                      <strong>{participant.name}</strong>
                      <span>{participant.email}</span>
                    </button>
                  ))}
                  {!searching && !searchError && suggestions.length === 0 && <p>No verified participants found.</p>}
                </div>
              )}
            </div>
            <button className="ui-button" type="submit" disabled={busy === 'invite' || slotsAvailable <= 0 || !selectedParticipant}>
              {busy === 'invite' ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
          <small>{slotsAvailable > 0 ? `${slotsAvailable} member slot${slotsAvailable === 1 ? '' : 's'} available, including pending invitations.` : 'No member slots are available.'}</small>
        </form>
      )}

      <div className="invitation-list">
        <h3>Received</h3>
        {received.length ? received.map((item) => (
          <article className="invitation-row" key={item.id}>
            <div>
              <strong>{item.team?.name || 'Unavailable team'}</strong>
              <p>Invited by {item.inviter?.name || 'a team leader'} · {item.status}</p>
            </div>
            {item.status === 'pending' && !team && (
              <div className="invitation-actions">
                <button type="button" className="ui-button" disabled={Boolean(busy)} onClick={() => respond(item.id, 'accept')}>
                  {busy === item.id ? 'Working…' : 'Accept'}
                </button>
                <button type="button" className="ui-button ui-button-ghost" disabled={Boolean(busy)} onClick={() => respond(item.id, 'reject')}>Reject</button>
              </div>
            )}
          </article>
        )) : <p className="muted-copy">No team invitations received.</p>}
      </div>

      {isLeader && (
        <div className="invitation-list">
          <h3>Sent</h3>
          {sent.length ? sent.map((item) => (
            <article className="invitation-row" key={item.id}>
              <div>
                <strong>{item.invitee?.name || item.invitee?.email || 'Participant'}</strong>
                <p>{item.invitee?.email || ''} · {item.status}</p>
              </div>
              <span className={`invitation-status ${item.status}`}>{item.status}</span>
            </article>
          )) : <p className="muted-copy">You have not sent any invitations.</p>}
        </div>
      )}
    </section>
  );
}
