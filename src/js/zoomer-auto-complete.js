(function (window, document) {
  'use strict';

  var angular = window.angular,
      google = window.google,
      module = angular.module('zoomer-auto-complete', []),
      predictionDelay = 750,
      blurDelay = 350,
      tpl;

  tpl = '<div class="z-auto-complete-wrapper">' +
    '<div class="z-auto-complete-input"><input ng-focus="toggleShowDropdown(true)" ng-blur="blur()" type="text" ng-keyup="keyUp($event)">' +
    '<div ng-if="showDropdown && predictions.length" class="z-auto-complete-results"><ul>' +
    '<li ng-repeat="prediction in predictions" ng-bind="prediction.description" ng-click="setPrediction(prediction)" ng-class="{ highlight: $index === highlightIndex }"></li>' +
    '</ul><p>Powered by <span>Google</span></p></div></div></div>';

  /**
   * Convert max_delivery_miles value to metres
   *
   * @param {Number} miles
   * @return {Number}
   */
  function getMetres(miles) {
    miles = miles || 5;
    return miles * 1609.34;
  }

  module.directive('zAutoComplete', [
    '$rootScope', '$q', '$timeout',
    function ($rootScope, $q, $timeout) {

      /**
       * Controller shared across instances of the Directives
       */
      function controller() {
        var dummy = document.createElement('div'),
            placesService;

        this.init = function () {
          var service = $q.defer();
          if (!google) {
            service.reject('missing Google library!');
            return service.promise;
          }
          service.resolve(new google.maps.places.AutocompleteService());
          return service.promise;
        };

        /**
         * Get instance of PlacesService and fetch place details
         *
         * @param {String} placeId
         * @return {Object} promise
         */
        this.getPlace = function (placeId) {
          var q = $q.defer(),
              self = this;

          if (!google) {
            q.reject('missing Google library!');
            return q.promise;
          }

          if (!placesService) {
            placesService = new google.maps.places.PlacesService(dummy);
          }
          placesService.getDetails({ placeId: placeId }, function (place, status) {
            q.resolve(self.parsePlace(place, status));
          });
          return q.promise;
        };

        this.parsePlace = function (place, status) {
          place = place || {};
          var components = place.address_components || [],
              data = {};
          angular.forEach(components, function (component) {
            data[component.types[0]] = {
              short_name: component.short_name,
              long_name: component.long_name
            };
          });
          return {
            place: data,
            status: status
          };
        }

      }

      /**
       * Bind on render of the Direct
       *
       * @param {Object} scope
       * @param {Object} element
       * @param {Object} attributes
       * @param {Object} controller
       */
      function link(scope, element, attributes, controller) {
        var inputEl = element.find('input'),
            el = element[0],
            classNames = el.className,
            id = el.id,
            autoCompleteService,
            reset,
            getLocation,
            getPredictions,
            getPlaceDetails,
            configure,
            timeout,
            setError;

        classNames = classNames.replace(/z-auto-complete-wrapper|ng-isolate-scope/gi, '');
        element.removeAttr('id');
        element.removeClass(classNames);

        inputEl[0].setAttribute('id', id);
        inputEl.addClass(classNames);

        scope.showDropdown = false;
        scope.predictions = [];
        scope.highlightIndex = 0;
        scope.selected = null;

        /**
         * If the user presses carriage return, check current state of results and parse accordingly.
         */
        scope.setPrediction = function (prediction) {
          if (prediction) {
            return getPlaceDetails(prediction.place_id);
          }

          if (scope.predictions.length) {
            getPlaceDetails(scope.predictions[scope.highlightIndex].place_id);
          }
        };

        /**
         * Configure response for when user taps up/down arrow to selected locations
         *
         * @param {Number} keyCode
         */
        scope.parseArrows = function (keyCode) {
          var predictionsLength = scope.predictions.length || 0;
          if (!predictionsLength) {
            return;
          }

          if (keyCode === 38 && scope.highlightIndex > 0) {
            scope.highlightIndex -= 1;
            return;
          }

          if (keyCode === 40 && scope.highlightIndex < (predictionsLength - 1)) {
            scope.highlightIndex += 1;
          }
        };

        /**
         * On keyUp with the field, check it's not tertiary behaviour using arrow keys / return etc.
         *
         * @param {Object} e
         */
        scope.keyUp = function (e) {
          var keyCode = e.keyCode,
              input = inputEl.val().trim();

          if (timeout) {
            $timeout.cancel(timeout);
          }

          if (keyCode === 13) { // return
            e.preventDefault();
            return scope.setPrediction();
          }

          if (keyCode === 38 || keyCode === 40) { // up|down
            return scope.parseArrows(keyCode);
          }

          scope.toggleShowDropdown(true);
          timeout = $timeout(function () {
            getPredictions(input);
          }, predictionDelay);
        };

        /**
         * Hide the drop-down after delay
         */
        scope.blur = function () {
          $timeout(function () {
            scope.toggleShowDropdown(false);
          }, blurDelay);
        };

        /**
         * Toggle visibility of the dropdown Element
         *
         * @param {Boolean} toggle
         */
        scope.toggleShowDropdown = function (toggle) {
          scope.$evalAsync(function () {
            scope.showDropdown = !!toggle;
          });
        };

        reset = function () {
          scope.highlightIndex = 0;
          scope.selected = null;
          scope.predictions = [];
          scope.showDropdown = false;
        };

        /**
         * Check for coordinates
         */
        getLocation = function () {
          var location = scope.locationBias || {},
              latitude = location.latitude || location.lat,
              longitude = location.longitude || location.long || location.lon;
          return new google.maps.LatLng(latitude, longitude);
        };

        /**
         * Assume text supplied, make a request to Google server for predictions
         */
        getPredictions = function (text) {
          if (!autoCompleteService || !text || text === '') {
            return;
          }
          var radius = getMetres(attributes.zMilesRadius);

          autoCompleteService.getQueryPredictions({
          //autoCompleteService.getPlacePredictions({
              input: text,
              radius: radius,
              location: getLocation()
          }, function (predictions) {
            scope.$evalAsync(function () {
              scope.predictions = predictions;
            })
          });
        };

        /**
         * Retrieve the place details from the server
         *
         * @param {String} placeId
         */
        getPlaceDetails = function (placeId) {
          controller.getPlace(placeId).then(function (data) {
            data = data || {};
            scope.selected = data.place;
            scope.callback(scope);
            inputEl[0].blur();
            reset();
          });
        };

        configure = function (service) {
          if (!service) {
            return;
          }
          autoCompleteService = service;
        };

        setError = function (error) {
          console.error(error);
        };

        controller.init().then(configure, setError);
      }

      return {
        controller: [ '$scope', controller ],
        link: link,
        replace: true,
        scope: {
          locationBias: '=zLocation',
          callback: '&zAutoComplete'
        },
        template: tpl
      }
    }
  ]);

}(window, document));