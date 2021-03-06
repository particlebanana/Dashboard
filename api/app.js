var socket, app, staticContent, proxyServer, socketProxy,
    http = require('http'),
    httpProxy = require('http-proxy'),
    path = require('path'),
    io = require('socket.io'),
    StaticServer = require('node-static').Server,
    EventSub = require('node-redis-events').Subscriber,
    sockets = require('./sockets');


/*
 * Internal http proxy for tickets and other apps,
 * our actual app runs on port 3001
 */
proxyServer = httpProxy.createServer(function(req, res, proxy) {
  /*
   * Rewrite /ticket-system/api/... to /api/...
   * and pass request to ticket-system
   */
  if(req.url.match(/\/ticket-system\/api\/?/)) {
    /*
     * Rewrite the url from /ticket-system/route* to /route*
     */
    req.url = req.url.replace(/\/ticket-system\//, '/');

    /*
     * Add the auth header
     */
    req.headers['X-Auth-Token'] = process.env.TICKETS_TOKEN || '';
    proxy.proxyRequest(req, res, {
      host: process.env.TICKETS_HOST,
      port: process.env.TICKETS_PORT
    });
  }
  else {
    /*
     * Proxy the request to the localhost
     */
    proxy.proxyRequest(req, res, {
      host: 'localhost',
      port: 3001
    });
  }

}).listen(process.env.PORT || 3000);

/*
 * Proxy the websocket connection, on upgrade event
 * proxy the connection to localhost:3001
 */
socketProxy = new httpProxy.RoutingProxy();

proxyServer.on('upgrade', function(req, socket, head) {
  socketProxy.proxyWebSocketRequest(req, socket, head, {
    host: 'localhost',
    port: 3001
  });
});


/* App Serving logic */

/*
 * Start socketio and server
 */
app = http.createServer(handler);
socket = io.listen(app);
app.listen(3001);


/*
 * Define our event subscriber object
 */
app.subscriber = new EventSub({
  hostname: '127.0.0.1'
});

/*
 * define our namespace 'routes' we want to subscribe to
 *
 * `sockets.SocketController` returns a function for the
 *  subscriber to invoke
 */
app.subscriber.add('tickets', sockets.Tickets(socket));
app.subscriber.add('lunch', sockets.Lunch(socket));

/*
 * Set up our static server
 */
staticContent = new StaticServer(path.join(__dirname, '../client'));

/*
 * Default handler for the server
 */
function handler(req, res) {
  req.addListener('end', function() {
    staticContent.serve(req, res);
  });
}