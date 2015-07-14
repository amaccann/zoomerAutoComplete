(function (window, document) {
  'use strict';

  var angular = window.angular,
      google = window.google,
      module = angular.module('zoomer-auto-complete', []),
      predictionDelay = 500,
      blurDelay = 350,
      tpl;

  tpl = '<div class="z-auto-complete-wrapper">' +
    '<div class="z-auto-complete-input"><input ng-model="zNgModel" ng-focus="focus()" ng-blur="blur()" type="text" ng-keyup="keyUp($event)">' +
    '<div ng-if="showDropdown && predictions.length" class="z-auto-complete-results"><ul>' +
    '<li ng-repeat="prediction in predictions" ng-click="setPrediction(prediction)" ng-class="{ selected: prediction.selected, highlight: $index === highlightIndex }">' +
    '<i class="fa" ng-class="{ \'fa-cog fa-spin\': prediction.selected, \'fa-map-marker\': !prediction.selected }"></i><span ng-bind-html="prediction| zMatchSubStrings"></span>' +
    '</li>' +
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

  /**
   * Swap the text at start:end and wrap it with a <strong>
   *
   * @param {String} target
   * @param {Number} start
   * @param {Number} end
   * @param {String} what
   * @return {String}
   */
  function replaceAt(target, start, end, what) {
    return target.substring(0, start) + '<strong>'+ what +'</strong>' + target.substring(end);
  }

  module.filter('zMatchSubStrings', [
    '$sce',
    function ($sce) {
      return function (prediction) {
        prediction = prediction || {};
        var description = prediction.description || '',
            subStrings = prediction.matched_substrings || [],
            sub;

        angular.forEach(subStrings, function (subString) {
          sub = description.substr(subString.offset, subString.length);
          description = replaceAt(description, subString.offset, (subString.offset + subString.length), sub)
        });
        return $sce.trustAsHtml(description);
      }
    }
  ]);

  module.directive('zAutoComplete', [
    '$rootScope', '$q', '$timeout',
    function ($rootScope, $q, $timeout) {

      /**
       * Controller shared across instances of the Directives
       *
       * @param {Object} $scope
       */
      function controller($scope) {
        var dummy = document.createElement('div'),
            autoCompleteService,
            placesService;

        /**
         * Check for coordinates
         *
         * @return {Object}
         */
        this.getLocation = function () {
          var location = $scope.locationBias || {},
            latitude = location.latitude || location.lat,
            longitude = location.longitude || location.long || location.lon;
          return new google.maps.LatLng(latitude, longitude);
        };

        /**
         * Format getQueryPredictions params
         *
         * @param {String} text
         * @return {Object}
         */
        this.getOptions = function (text) {
          var radius = getMetres($scope.milesRadius);
          return {
            input: text,
            radius: radius,
            location: this.getLocation()
          };
        };

        /**
         * Use Google AutocompleteService to get predictions of possible places
         *
         * @param {String} text
         * @return {Object} $promise
         */
        this.getPrediction = function (text) {
          var q = $q.defer(),
              options = this.getOptions(text);

          if (!google) {
            q.reject('missing Google library!');
            return q.promise;
          }

          if (!autoCompleteService) {
            autoCompleteService = new google.maps.places.AutocompleteService();
          }
          autoCompleteService.getQueryPredictions(options, function (predictions, status) {
            q.resolve({ predictions: (predictions || []), status: status })
          });
          return q.promise;
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

        /**
         * Iterate across the place object, turning it into formatted address
         *
         * @param {Object} place
         * @param {String} status
         * @return {Object}
         */
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
            form = angular.element(inputEl[0],form),
            previousInput = '',
            el = element[0],
            classNames = el.className,
            id = el.id,
            name = el.getAttribute('name'),
            reset,
            bindFormKeypress,
            unbindFormKeypress,
            getPredictions,
            getPlaceDetails,
            timeout;

        classNames = classNames.replace(/z-auto-complete-wrapper|ng-isolate-scope/gi, '');
        element.removeAttr('id');
        element.removeClass(classNames);

        if (name) {
          inputEl[0].setAttribute('name', name);
        }
        inputEl[0].setAttribute('id', id);
        inputEl.addClass(classNames);
        if (attributes.zPlaceholder) {
          inputEl[0].setAttribute('placeholder', attributes.zPlaceholder);
        }

        scope.showDropdown = false;
        scope.predictions = [];
        scope.highlightIndex = 0;
        scope.selected = null;

        /**
         * If the user presses carriage return, check current state of results and parse accordingly.
         */
        scope.setPrediction = function (prediction) {

          if (prediction) {
            prediction.selected = true;
            return getPlaceDetails(prediction.place_id);
          }

          if (scope.predictions.length) {
            scope.predictions[scope.highlightIndex].selected = true;
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

          if (keyCode === 32) { // space
            return getPredictions(input);
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
         * Show drop-down onFocus and bind to form
         */
        scope.focus = function () {
          scope.toggleShowDropdown(true);
          bindFormKeypress();
        };

        /**
         * Hide the drop-down after delay
         */
        scope.blur = function () {
          $timeout(function () {
            scope.toggleShowDropdown(false);
            unbindFormKeypress();
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

        /**
         * Prevent carriage-return submissions when using auto-complete
         */
        bindFormKeypress = function () {
          form.on('keydown', function (e) {
            if (e.keyCode === 13) {
              e.preventDefault();
              return false;
            }
          });
        };

        /**
         * Unbind binding
         */
        unbindFormKeypress = function () {
          form.off('keydown');
        };

        /**
         * Reset all values
         */
        reset = function () {
          scope.highlightIndex = 0;
          scope.selected = null;
          scope.predictions = [];
          scope.showDropdown = false;
          previousInput = '';
        };

        /**
         * Assume text supplied, make a request to Google server for predictions
         */
        getPredictions = function (text) {
          if (!text || text === '' || text === previousInput) {
            return;
          }
          previousInput = text;

          controller.getPrediction(text).then(function (data) {
            data = data || {};
            scope.predictions = data.predictions || [];
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
      }

      return {
        controller: [ '$scope', controller ],
        link: link,
        replace: true,
        scope: {
          locationBias: '=zLocation',
          callback: '&zAutoComplete',
          milesRadius: '=zMilesRadius',
          zNgModel: '=ngModel'
        },
        template: tpl
      }
    }
  ]);

}(window, document));