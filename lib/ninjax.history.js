/*global window, document, console, jQuery, History */
/*jslint eqeq:true */
(function ($, History) {
  'use strict';

  var $document = $(document);

  $document.on('activate.ninjax', function (event) {
    var $layer = $(event.target),
      url = $layer.data('url');

    // If the layer has no data-url attribute, skip this push state.
    if (url == null) {
      return;
    }

    History.pushState(event.options, $layer.data('title'), url);
  });

  History.Adapter.bind(window, 'statechange', function () {
    var state = History.getState();

    console.log(state);
  });
}(jQuery, History));