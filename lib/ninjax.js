/*global window, document, console, jQuery */
/*jslint eqeq:true */
/**
 * @file Main ninjax library.
 * @author Lennart Hildebrandt
 * @license MIT
 */
(function (root, $) {
  'use strict';

  /**
   * The ninjax library namespace.
   *
   * @namespace ninjax
   */
  var ninjax = {};

  /**
   * Ninjax container class containing one or more layers.
   *
   * @class ninjax.Container
   * @param element {HTMLElement|string} Selector for container element.
   */
  function Container(element) {
    this.$element = $(element);
    this.currentLayer = this.layers()[0];
  }

  Container.prototype = {
    /**
     * The jQuery Object of the container element.
     *
     * @name ninjax.Container#$element
     * @readonly
     * @type {jQuery}
     */

    /**
     * Request layer for placing it inside the container.
     *
     * @method ninjax.Container#request
     * @param {string} url
     * @param {Object} [options=Object]
     * @fires ninjax.Container#request
     * @fires ninjax.Container#requestdone
     * @fires ninjax.Container#requestfail
     * @returns {ninjax.Container}
     */
    request: function (url, options) {
      var container = this,
        $element = container.$element,
        event;

      // If container is disabled, do not send request
      if ($element.is('.disabled, :disabled')) {
        return this;
      }

      event = $.Event('request.ninjax', {
        container: container,
        options: options
      });

      /**
       * Event fired when container request a layer.
       *
       * @event ninjax.Container#request
       * @property {ninjax.Container} container
       * @property {Object} options
       */
      $element.trigger(event);

      if (event.isDefaultPrevented()) {
        return this;
      }

      // Copy options, so that we can add properties
      options = $.extend({}, options);
      options.url = url;

      $.ajax(options)
        .done(function (response) {
          /**
           * Event fired if layer request was successful.
           *
           * @event ninjax.Container#requestdone
           * @property {ninjax.Container} container
           * @property {string} response
           * @property {Object} options
           */
          $element.trigger({ type: 'requestdone.ninjax', container: container, response: response, options: options });
          container.add(response, options);
        })
        .fail(function (jqXHR) {
          /**
           * Event fired if layer request failed.
           *
           * @event ninjax.Container#requestfail
           * @property {ninjax.Container} container
           * @property {string} response
           * @property {Object} options
           */
          $element.trigger({ type: 'requestfail.ninjax', container: container, jqXHR: jqXHR, options: options });
          console.error('Ninjax request failed', jqXHR);
        });

      return this;
    },

    /**
     * Add a layer.
     *
     * @method ninjax.Container#add
     * @param {string|HTMLElement}layer
     * @param {Object} [options=Object]
     * @fires ninjax.Container#add
     * @fires ninjax.Container#added
     * @returns {ninjax.Container}
     */
    add: function (layer, options) {
      var $element = this.$element,
        newLayer = ninjax.layer(layer),
        event,
        oldLayer,
        position,
        wasActive;

      event = $.Event('add.ninjax', {
        container: this,
        layer: newLayer,
        options: options
      });

      /**
       * Event fired when layer is added.
       *
       * @event ninjax.Container#add
       * @property {ninjax.Container} container
       * @property {ninjax.Layer} layer
       * @property {Object} options
       */
      $element.trigger(event);
      if (event.isDefaultPrevented()) {
        return this;
      }

      // Flag for saving active state of old layer
      wasActive = false;

      // If old layer with same id exists, replace it with the new one
      oldLayer = this.layers().filter(function () {
        return this.equals(newLayer);
      })[0];

      if (oldLayer != null) {
        wasActive = oldLayer.$element.hasClass('active');
        oldLayer.$element.replaceWith(newLayer.$element);
      }

      // If we replaced an old active layer, we do not want replace it.
      if (!wasActive) {
        position = options.position === 'previous' ? 'before' : 'after';
        this.currentLayer.$element[position](newLayer.$element);
      }

      /**
       * Event fired when layer was added.
       *
       * @event ninjax.Container#added
       * @property {ninjax.Container} container
       * @property {ninjax.Layer} layer
       * @property {Object} options
       */
      $element.trigger({ type: 'added.ninjax', container: this, layer: newLayer, options: options });

      // Activate the new layer
      this.currentLayer = newLayer.activate(options);

      return this;
    },

    /**
     * Helper for getting all layers in the container
     *
     * @method ninjax.Container#layers
     * @returns {ninjax.Layer[]}
     */
    layers: function () {
      return this.$element.children('[data-ninjax-layer]').map(function () {
        return ninjax.layer(this);
      });
    }
  };

  /**
   * Helper for getting a ninjax container from the given element.
   *
   * @function ninjax#container
   * @param {String|HTMLElement} element
   * @returns {ninjax.Container}
   */
  ninjax.container = function (element) {
    var $container = $(element),
      data = $container.data('ninjax.container');

    if (data == null) {
      data = new Container($container);
      $container.data('ninjax.container', data);
    }

    return data;
  };

  /*
   Copy Container into ninjax namespace.
   */
  ninjax.Container = Container;

  /**
   * Ninjax layer class.
   *
   * @class ninjax.Layer
   * @param {HTMLElement|String} element The layer element.
   * @throws Will throw an error if the given element is no valid ninjax layer (has no data-ninjax-layer attribute).
   * @constructor
   */
  function Layer(element) {
    var $element = $(element),
      name = $element.data('ninjaxLayer');

    // Warn if we have an invalid layer (no data-ninjax-layer attribute)
    if (name == null) {
      console.error('Invalid ninjax layer.', element);
    }

    this.$element = $element;
    this.name = name;
  }

  Layer.prototype = {
    /**
     * The jQuery Object of the layer element.
     *
     * @name ninjax.Layer#$element
     * @readonly
     * @type {jQuery}
     */

    /**
     * Activates the layer.
     *
     * @method ninjax.Layer#activate
     * @param {Object} [options=Object] Options for activating the layer.
     * @fires ninjax.Layer#activate
     * @fires ninjax.Layer#activated
     * @returns {ninjax.Layer}
     */
    activate: function (options) {
      var $element = this.$element,
        event;

      if ($element.hasClass('active') && $element.is('.disabled, :disabled')) {
        return;
      }

      event = $.Event('activate.ninjax', {layer: this, options: options});

      /**
       * Fired when layer gets activated.
       *
       * @event ninjax.Layer#activate
       * @property {ninjax.Layer} layer
       * @property {Object} options
       */
      $element.trigger(event);
      if (event.isDefaultPrevented()) {
        return this;
      }

      // Deactivate other layers in the container.
      $element.siblings('[data-ninjax-layer]').each(function () {
        ninjax.layer(this).deactivate(options);
      });

      /**
       * Fired after layer was activated.
       *
       * @event ninjax.Layer#activated
       * @property {ninjax.Layer} layer
       * @property {Object} options
       */
      $element.addClass('active')
        .trigger({ type: 'activated.ninjax', layer: this, options: options });

      return this;
    },

    /**
     * Deactivate layer.
     *
     * @method ninjax.Layer#deactivate
     * @param {Object} [options=Object]
     * @fires ninjax.Layer#deactivate
     * @fires ninjax.Layer#deactivated
     * @returns {ninjax.Layer}
     */
    deactivate: function (options) {
      var $element = this.$element,
        event = $.Event('deactivate.ninjax');

      /**
       * Fired when layer gets deactivated.
       *
       * @event ninjax.Layer#deactivate
       * @property {ninjax.Layer} layer
       * @property {Object} options
       */
      $element.trigger(event, { layer: this, options: options });
      if (event.isDefaultPrevented()) {
        return this;
      }

      /**
       * Fired after layer was deactivated.
       *
       * @event ninjax.Layer#deactivated
       * @property {ninjax.Layer} layer
       * @property {Object} options
       */
      $element.removeClass('active')
        .trigger({ type: 'deactivated.ninjax', layer: this, options: options });

      return this;
    },

    /**
     * Check if two layers are equal.
     *
     * @method ninjax.Layer#equals
     * @param {ninjax.Layer} layer The other layer to compare with.
     * @returns {boolean}
     */
    equals: function (layer) {
      return this.name === layer.name;
    }
  };

  /**
   * Helper for getting a ninjax layer from the given element.
   *
   * @function ninjax#layer
   * @param {HTMLElement|String} element
   * @returns {ninjax.Layer}
   */
  ninjax.layer = function (element) {
    var $layer = $(element),
      data = $layer.data('ninjax.layer');

    if (data == null) {
      data = new Layer($layer);
      $layer.data('ninjax.layer', data);
    }

    return data;
  };

  /*
   Copy layer class into ninjax namespace.
   */
  ninjax.Layer = Layer;

  /*
   Copy ninjax into root (window).
   */
  root.ninjax = ninjax;

  /**
   * @external jQuery
   * @see {@link http://api.jquery.com/}
   * @namespace
   */

  /**
   * jQuery plugin for transforming elements into {@link ninjax.Container}.
   *
   * @function jQuery#ninjax
   * @param {string} [method=] If given, use it as a method to call on the container.
   * @param {...*} [args=] Arguments passed to the method.
   * @returns {jQuery}
   */
  $.fn.ninjax = function () {
    var args = $.makeArray(arguments);

    return this.each(function () {
      var container = ninjax.container(this);

      if (args.length > 0) {
        container[args[0]].apply(container, args.slice(1));
      }
    });
  };

  /*
   Listen to click and submit events on ninjaxified links and forms.
   */
  $(document).on('click.ninjax submit.ninjax', '[data-ninjax]', function (event) {
    var $target = $(event.target),
      options = {},
      selector = $target.data('target'),
      url,
      $container;

    event.preventDefault();

    // If data target attribute is set, use it as container.
    $container = selector != null ? $(selector) : $target.closest('[data-ninjax-container]');

    // Get URL by href or action attribute accordingly to the event type
    url = event.type === 'click' ? $target.attr('href') : $target.attr('action');

    // When we have a form submit event, check for the form method.
    if (event.type === 'submit') {
      options.method = $target.attr('method') || 'GET';
    }

    // Add position to options hash
    options.position = $target.data('ninjax');

    // Make a ninjax request from the container.
    $container.ninjax('request', url, options);
  });

}(window, jQuery));