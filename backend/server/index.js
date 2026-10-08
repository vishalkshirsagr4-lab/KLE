const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connect } = require('./db');
const { User } = require('./models');
const { setRealtimeServer } = require('./lib/realtime');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ['GET', 'POST'],
    credentials: false
  }
});

io.use(async (socket, next) => {
  let payload;
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !process.env.JWT_SECRET) return next(new Error('Authentication required.'));
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new Error('Authentication failed.'));
  }

  try {
    await connect();
    const user = await User.findById(payload.id).select('_id role emailVerified');
    if (!user || user.role !== 'participant' || !user.emailVerified) return next(new Error('Verified participant account required.'));
    socket.data.userId = user._id.toString();
    next();
  } catch (error) {
    console.error('Socket authentication lookup failed:', error.message);
    next(new Error('Notification service is unavailable.'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.userId}`);
});
setRealtimeServer(io);

server.listen(port, () => console.log(`KLE Hackathon 2K26 running on port ${port}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${port} is already in use.\nRun this to fix it:\n  npx kill-port ${port}\nThen restart the server.\n`);
  } else {
    console.error('[SERVER ERROR]', err.message);
  }
  process.exit(1);
});
