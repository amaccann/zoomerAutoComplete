(function () {
  'use strict';

  var angular = window.angular,
      module = angular.module('exampleApp', [
        'zoomer-auto-complete'
      ]);
  module.run([
    '$rootScope',
    function ($rootScope) {
      $rootScope.testProp = 'hi there';
      $rootScope.locationSelected = null;

      $rootScope.myLocation1 = {
        latitude: 39.6638557,
        longitude: -75.656541
      };

      $rootScope.myLocation2 = {
        latitude: 53.3,
        longitude: -6.3
      };

      $rootScope.doStuff = function (selected) {
        $rootScope.locationSelected = selected || null;
      };
    }
  ]);

}());