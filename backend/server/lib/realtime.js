let io;

function setRealtimeServer(server) {
  io = server;
}

function getRealtimeServer() {
  return io;
}

module.exports = { setRealtimeServer, getRealtimeServer };
