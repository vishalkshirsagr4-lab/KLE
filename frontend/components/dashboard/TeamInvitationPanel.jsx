'use client';

import { useState } from 'react';

export default function TeamInvitationPanel({ token, user, team, invitations, onUpdated }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
    setBusy('invite');
    setError('');
    setNotice('');
    try {
      await request('/api/team/invite', 'POST', { email });
      setEmail('');
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
          <p>Invite a registered, verified participant by email. They will join only after accepting.</p>
          <div className="team-invite-controls">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@example.com"
              aria-label="Participant email"
              required
            />
            <button className="ui-button" type="submit" disabled={busy === 'invite' || slotsAvailable <= 0}>
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
