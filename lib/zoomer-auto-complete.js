(function (window) {
  'use strict';

  var angular = window.angular,
      module = angular.module('zoomer-auto-complete', []);

  module.directive('zAutoComplete', [
    '$rootScope', '$channel', '$connection',
    function ($rootScope, $channel, $connection) {
      return function (scope, element) {
        console.log('scope!', scope);
      }
    }
  ]);

}(window));