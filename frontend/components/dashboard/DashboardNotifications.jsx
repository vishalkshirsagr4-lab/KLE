'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Icon from '../ui/Icon';

const PAGE_SIZE = 20;
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';

function authHeaders(token, json = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minute${seconds < 120 ? '' : 's'} ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${seconds < 7200 ? '' : 's'} ago`;
  return `${Math.floor(seconds / 86400)} day${seconds < 172800 ? '' : 's'} ago`;
}

function fromBase64Url(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function PushPrompt({ token }) {
  const [available, setAvailable] = useState(false);
  const [permission, setPermission] = useState('default');
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPermission(Notification.permission);
    setDismissed(window.localStorage.getItem('kle-push-prompt-dismissed') === '1');
    fetch('/api/notifications/push/public-key', { headers: authHeaders(token) })
      .then(readResponse)
      .then((result) => setAvailable(result.enabled && Boolean(result.publicKey)))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  const saveSubscription = async (subscription) => {
    await readResponse(await fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify(subscription.toJSON())
    }));
  };

  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      const keyResponse = await fetch('/api/notifications/push/public-key', { headers: authHeaders(token) });
      const { publicKey, enabled } = await readResponse(keyResponse);
      if (!enabled || !publicKey) throw new Error('Browser notifications are not configured yet.');
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setError(result === 'denied' ? 'Browser notifications are blocked. In-app notifications will still work.' : 'Notification permission was not granted.');
        return;
      }
      const registration = await ensureServiceWorker();
      if (!registration) throw new Error('This browser does not support web notifications.');
      const subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(publicKey)
        });
      await saveSubscription(subscription);
      setAvailable(true);
      setDismissed(true);
      window.localStorage.setItem('kle-push-prompt-dismissed', '1');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (permission !== 'granted' || !available) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/notifications/push/public-key', { headers: authHeaders(token) });
        const { publicKey, enabled } = await readResponse(response);
        if (!enabled || !publicKey || cancelled) return;
        const registration = await ensureServiceWorker();
        if (!registration || cancelled) return;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && !cancelled) await saveSubscription(subscription);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    })();
    return () => { cancelled = true; };
  }, [available, permission, token]);

  if (!available || permission === 'denied' || permission === 'granted' || dismissed) return null;
  return (
    <section className="workspace-panel push-prompt" aria-label="Browser notification settings">
      <div>
        <p className="workspace-kicker">Stay up to date</p>
        <h2>Enable browser notifications</h2>
        <p>Get important KLE announcements and team invitations instantly.</p>
      </div>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="push-prompt-actions">
        <button type="button" className="ui-button" disabled={busy} onClick={enable}>{busy ? 'Enabling…' : 'Enable notifications'}</button>
        <button type="button" className="ui-button ui-button-ghost" onClick={() => {
          setDismissed(true);
          window.localStorage.setItem('kle-push-prompt-dismissed', '1');
        }}>Not now</button>
      </div>
    </section>
  );
}

function NotificationItem({ notification, selected, onSelect, onOpen, onRead, onDelete, busy, onInvitation }) {
  const isInvite = notification.type === 'TEAM' && notification.metadata?.invitationId &&
    !notification.metadata?.invitationStatus;
  return (
    <article className={`notification-card ${notification.isRead ? 'is-read' : 'is-unread'}`}>
      <label className="notification-select">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(notification.id)}
          aria-label={`Select ${notification.title}`}
        />
      </label>
      <button type="button" className="notification-content" onClick={() => onOpen(notification)}>
        <span className="notification-indicator" aria-hidden="true">{notification.isRead ? '○' : '●'}</span>
        <span className="notification-copy">
          <strong>{notification.title}</strong>
          <span>{notification.message}</span>
          <time dateTime={notification.createdAt}>{timeAgo(notification.createdAt)}</time>
        </span>
      </button>
      <div className="notification-actions">
        {isInvite && (
          <>
            <button type="button" disabled={Boolean(busy)} onClick={() => onInvitation(notification, 'accept')}>Accept</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => onInvitation(notification, 'reject')}>Reject</button>
          </>
        )}
        {!notification.isRead && <button type="button" disabled={Boolean(busy)} onClick={() => onRead(notification.id)}>Mark read</button>}
        <button type="button" disabled={Boolean(busy)} aria-label={`Delete ${notification.title}`} onClick={() => onDelete(notification.id)}>Delete</button>
      </div>
    </article>
  );
}

export default function DashboardNotifications({
  token,
  active,
  onNavigate,
  onUnreadCountChange,
  onTeamUpdate
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const activeRef = useRef(active);
  const countChangeRef = useRef(onUnreadCountChange);
  const unreadCountRef = useRef(0);
  const unreadRevisionRef = useRef(0);
  const toastTimer = useRef(null);
  const handledPushUrl = useRef(false);
  const seenNotificationIds = useRef(new Set());
  const registrationRef = useRef(null);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { countChangeRef.current = onUnreadCountChange; }, [onUnreadCountChange]);

  const updateUnread = useCallback((count) => {
    const safeCount = Math.max(0, Number(count) || 0);
    unreadRevisionRef.current += 1;
    unreadCountRef.current = safeCount;
    setUnreadCount(safeCount);
    countChangeRef.current?.(safeCount);
  }, []);

  const ensureServiceWorker = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    if (registrationRef.current) return registrationRef.current;
    registrationRef.current = navigator.serviceWorker.register('/service-worker.js');
    return registrationRef.current;
  }, []);

  const refreshUnread = useCallback(async () => {
    const revision = unreadRevisionRef.current;
    const response = await fetch('/api/notifications/unread-count', { headers: authHeaders(token) });
    const data = await readResponse(response);
    if (revision === unreadRevisionRef.current) updateUnread(data.unreadCount);
  }, [token, updateUnread]);

  const loadPage = useCallback(async (requestedPage = 1, append = false) => {
    const response = await fetch(`/api/notifications?page=${requestedPage}&limit=${PAGE_SIZE}`, {
      headers: authHeaders(token)
    });
    const data = await readResponse(response);
    data.notifications.forEach((notification) => seenNotificationIds.current.add(notification.id));
    setNotifications((current) => {
      const joined = append ? [...current, ...data.notifications] : data.notifications;
      return [...new Map(joined.map((notification) => [notification.id, notification])).values()];
    });
    setPage(data.page);
    setHasMore(data.hasMore);
  }, [token]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadPage(1), refreshUnread()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [loadPage, refreshUnread]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => {
    if (!SOCKET_URL || !token) return undefined;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    const handleIncomingNotification = (notification) => {
      if (!notification || (!notification.id && !notification._id)) return;
      const normalized = { ...notification, id: notification.id || notification._id };
      if (seenNotificationIds.current.has(normalized.id)) return;
      seenNotificationIds.current.add(normalized.id);
      setNotifications((current) => [normalized, ...current].slice(0, PAGE_SIZE));
      updateUnread(unreadCountRef.current + 1);
      if (activeRef.current !== 'notifications') {
        setToast(normalized);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 6000);
      }
    };

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);
    const handleUpdated = (update) => {
      unreadRevisionRef.current += 1;
      if (update.clear) {
        setNotifications([]);
        updateUnread(0);
        return;
      }
      if (update.allRead) {
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
        updateUnread(0);
        return;
      }
      if (update.deleted) {
        setNotifications((current) => current.filter((item) => item.id !== update.id));
      } else if (update.isRead) {
        setNotifications((current) => current.map((item) => item.id === update.id
          ? { ...item, isRead: true, readAt: update.readAt, metadata: update.metadata || item.metadata }
          : item));
      }
      refreshUnread().catch((requestError) => setError(requestError.message));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('notification', handleIncomingNotification);
    socket.on('notification:new', handleIncomingNotification);
    socket.on('notification:updated', handleUpdated);

    return () => {
      clearTimeout(toastTimer.current);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('notification', handleIncomingNotification);
      socket.off('notification:new', handleIncomingNotification);
      socket.off('notification:updated', handleUpdated);
      socket.removeAllListeners();
      socket.disconnect();
      setSocketConnected(false);
      setNotifications([]);
      updateUnread(0);
    };
  }, [refreshUnread, token, updateUnread]);

  useEffect(() => {
    if (handledPushUrl.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const notificationId = params.get('notificationId');
    const view = params.get('view');
    if (view === 'teams' || view === 'notifications') onNavigate(view);
    if (!notificationId) return;
    handledPushUrl.current = true;
    fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
      headers: authHeaders(token)
    }).then(readResponse).then(async () => {
      await refreshUnread();
      await loadPage(1);
    }).catch((requestError) => setError(requestError.message));
  }, [loadPage, onNavigate, refreshUnread, token]);

  const markRead = async (id) => {
    setBusy(id);
    setError('');
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        headers: authHeaders(token)
      });
      await readResponse(response);
      setNotifications((current) => current.map((item) => item.id === id
        ? { ...item, isRead: true, readAt: new Date().toISOString() }
        : item));
      await refreshUnread();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const deleteNotification = async (id) => {
    setBusy(id);
    setError('');
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });
      await readResponse(response);
      setNotifications((current) => current.filter((item) => item.id !== id));
      setSelected((current) => current.filter((value) => value !== id));
      await refreshUnread();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const markAllRead = async () => {
    setBusy('all');
    setError('');
    try {
      await readResponse(await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: authHeaders(token)
      }));
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      updateUnread(0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return;
    setBusy('clear');
    setError('');
    try {
      await readResponse(await fetch('/api/notifications/clear', {
        method: 'DELETE',
        headers: authHeaders(token)
      }));
      setNotifications([]);
      setSelected([]);
      updateUnread(0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const deleteSelected = async () => {
    const outcomes = await Promise.allSettled(selected.map((id) =>
      fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      }).then(readResponse)
    ));
    const failures = outcomes.filter((outcome) => outcome.status === 'rejected');
    setSelected([]);
    if (failures.length) setError(failures[0].reason.message);
    await refreshAll();
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) await markRead(notification.id);
    setToast(null);
    const nextView = notification.type === 'TEAM'
      ? 'teams'
      : notification.type === 'ANNOUNCEMENT'
        ? 'announcements'
        : 'notifications';
    onNavigate(nextView);
  };

  const respondToInvitation = async (notification, decision) => {
    const invitationId = notification.metadata?.invitationId;
    if (!invitationId) return;
    setBusy(notification.id);
    setError('');
    try {
      const response = await fetch(`/api/team/invitations/${encodeURIComponent(invitationId)}/${decision}`, {
        method: 'POST',
        headers: authHeaders(token)
      });
      await readResponse(response);
      await markRead(notification.id);
      await onTeamUpdate();
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  if (active === 'overview') {
    return (
      <>
        <PushPrompt token={token} />
        {toast && (
          <div className="notification-toast" role="status" aria-live="polite">
            <button type="button" aria-label="Close notification" onClick={() => setToast(null)}><Icon name="x" size={15} /></button>
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
            <button type="button" className="notification-toast-open" onClick={() => openNotification(toast)}>View</button>
          </div>
        )}
      </>
    );
  }

  if (active !== 'notifications') return toast ? (
    <div className="notification-toast" role="status" aria-live="polite">
      <button type="button" aria-label="Close notification" onClick={() => setToast(null)}><Icon name="x" size={15} /></button>
      <strong>{toast.title}</strong>
      <span>{toast.message}</span>
      <button type="button" className="notification-toast-open" onClick={() => openNotification(toast)}>View</button>
    </div>
  ) : null;

  return (
    <>
      <PushPrompt token={token} />
      <div className="workspace-view notifications-view">
        <div className="workspace-view-heading notification-page-heading">
          <div>
            <p className="workspace-kicker">Your inbox</p>
            <h2>Notifications</h2>
            <p>Announcements, updates &amp; important information</p>
          </div>
          <div className="notification-toolbar">
            <button type="button" disabled={!unreadCount || Boolean(busy)} onClick={markAllRead}>Mark all</button>
            <button type="button" disabled={!selected.length || Boolean(busy)} onClick={deleteSelected}>Delete ({selected.length})</button>
            <button type="button" disabled={!notifications.length || Boolean(busy)} onClick={clearAll}>Clear all</button>
          </div>
        </div>

        {!socketConnected && SOCKET_URL && <p className="notification-connection" role="status">Live updates reconnecting. Your notifications will sync when connected.</p>}
        {error && <div className="workspace-alert" role="alert"><Icon name="x" size={15} />{error}</div>}
        {loading ? <div className="workspace-loading"><span className="loader-orbit" /><p>Loading notifications…</p></div> : (
          <section className="workspace-panel notification-list" aria-label="Notification list">
            {notifications.length ? notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                selected={selected.includes(notification.id)}
                onSelect={(id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}
                onOpen={openNotification}
                onRead={markRead}
                onDelete={deleteNotification}
                onInvitation={respondToInvitation}
                busy={busy}
              />
            )) : <div className="notification-empty"><Icon name="mail" size={22} /><h3>You’re all caught up</h3><p>Announcements and team invitations will appear here.</p></div>}
            {hasMore && <button type="button" className="notification-load-more" disabled={Boolean(busy)} onClick={async () => {
              setBusy('more');
              try { await loadPage(page + 1, true); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); }
            }}>{busy === 'more' ? 'Loading…' : 'Load more'}</button>}
          </section>
        )}
      </div>
      {toast && (
        <div className="notification-toast" role="status" aria-live="polite">
          <button type="button" aria-label="Close notification" onClick={() => setToast(null)}><Icon name="x" size={15} /></button>
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
          <button type="button" className="notification-toast-open" onClick={() => openNotification(toast)}>View</button>
        </div>
      )}
    </>
  );
}
