module.exports = function(io) {
  var stalker = io
  .of('/stalker')
  .on('connection', function(socket) {});

  /*
   * Process the event and pass the `data` we want to
   * the client.
   *
   * @param {event} - The event that fired
   * @param {data} - Object or string
   *
   * If `data` is an object, data.body is used
   * If `data` is a string, the string itself is used
   */
  function handler(event, data) {
    if(typeof(data) === 'object' && ~event.indexOf('stalker') && data.body) {
      data = data.body;
    }

    stalker.emit(event, data);
  }


  //Return handler as the main handler
  return handler;
};