!function(e,t){"use strict";function n(e){return e=e||5,1609.34*e}var o,i="Google library missing!",r=e.angular,s=e.google,c=r.module("zoomer-auto-complete",[]),l=500,a=350;o='<div class="z-auto-complete-wrapper"><div class="z-auto-complete-input"><input ng-model="zNgModel" ng-focus="focus()" ng-blur="blur()" type="text" ng-keyup="keyUp($event)"><div ng-if="showDropdown && predictions.length" class="z-auto-complete-results"><ul><li ng-repeat="prediction in predictions" ng-click="setPrediction(prediction)" ng-class="{ selected: prediction.selected, highlight: $index === highlightIndex }"><i class="fa" ng-class="{ \'fa-cog fa-spin\': prediction.selected, \'fa-map-marker\': !prediction.selected }"></i><span ng-bind-html="prediction| zMatchSubStrings"></span></li></ul><p>Powered by <span>Google</span></p></div></div></div>',c.filter("zMatchSubStrings",["$sce",function(e){return function(t){t=t||{};var n,o=t.description||"",i=t.matched_substrings||[],s=[];return r.forEach(i,function(e,t){var r=e.offset-(n?n.length:0),c=o.substr(0,r),l=o.substr(r,e.length),a=o.substr(r+e.length,o.length);s.push(c,"<strong>",l,"</strong>"),t===i.length-1&&s.push(a),o=o.substr(r+e.length,o.length),n=e}),e.trustAsHtml(s.join(""))}}]),c.directive("zAutoComplete",["$rootScope","$q","$timeout",function(e,c,d){function u(e){var o,l,a=t.createElement("div");this.getLocation=function(){var t=e.locationBias||{},n=t.latitude||t.lat,o=t.longitude||t["long"]||t.lon;return new s.maps.LatLng(n,o)},this.getOptions=function(t){var o=n(e.milesRadius);return{input:t,radius:o,location:this.getLocation()}},this.getPrediction=function(e){var t,n=c.defer();return s?(t=this.getOptions(e),o||(o=new s.maps.places.AutocompleteService),o.getQueryPredictions(t,function(e,t){n.resolve({predictions:e||[],status:t})}),n.promise):(n.reject(i),n.promise)},this.getPlace=function(e){var t=e.place_id,n=c.defer(),o=this;return s?(l||(l=new s.maps.places.PlacesService(a)),l.getDetails({placeId:t},function(t,i){n.resolve(o.parsePlace(t,e,i))}),n.promise):(n.reject(i),n.promise)},this.parsePlace=function(e,t,n){t=t||{},e=e||{};var o,i=e.address_components||[],s={};return r.forEach(i,function(e){o=e.types[0],o&&(s[o]={short_name:e.short_name,long_name:e.long_name})}),s.raw={address_components:e.address_components,formatted_address:e.formatted_address,suggestion:t},{place:s,status:n}}}function p(e,t,n,o){var i,s,c,u,p,g,h=t.find("input"),f=r.element(h[0],f),m="",v=t[0],w=v.className,b=v.id,z=v.getAttribute("name");w=w.replace(/z-auto-complete-wrapper|ng-isolate-scope/gi,""),t.removeAttr("id"),t.removeClass(w),z&&h[0].setAttribute("name",z),h[0].setAttribute("id",b),h.addClass(w),n.zPlaceholder&&h[0].setAttribute("placeholder",n.zPlaceholder),e.showDropdown=!1,e.predictions=[],e.highlightIndex=0,e.selected=null,e.setPrediction=function(t){return t?(t.selected=!0,p(t)):void(e.predictions.length&&(e.predictions[e.highlightIndex].selected=!0,p(e.predictions[e.highlightIndex])))},e.parseArrows=function(t){var n=e.predictions.length||0;if(n)return 38===t&&e.highlightIndex>0?void(e.highlightIndex-=1):void(40===t&&e.highlightIndex<n-1&&(e.highlightIndex+=1))},e.keyUp=function(t){var n=t.keyCode,o=h.val().trim();return g&&d.cancel(g),32===n?u(o):13===n?(t.preventDefault(),e.setPrediction()):38===n||40===n?e.parseArrows(n):(e.toggleShowDropdown(!0),void(g=d(function(){u(o)},l)))},e.focus=function(){e.toggleShowDropdown(!0),s()},e.blur=function(){d(function(){e.toggleShowDropdown(!1),c()},a)},e.toggleShowDropdown=function(t){e.$evalAsync(function(){e.showDropdown=!!t})},s=function(){f.on("keydown",function(e){return 13===e.keyCode?(e.preventDefault(),!1):void 0})},c=function(){f.off("keydown")},i=function(){e.highlightIndex=0,e.selected=null,e.predictions=[],e.showDropdown=!1,m=""},u=function(t){t&&""!==t&&t!==m&&(m=t,o.getPrediction(t).then(function(t){t=t||{},e.predictions=t.predictions||[]}))},p=function(t){t=t||{},o.getPlace(t).then(function(t){t=t||{},e.selected=t.place,e.callback(e),h[0].blur(),i()})}}return{controller:["$scope",u],link:p,replace:!0,scope:{locationBias:"=zLocation",callback:"&zAutoComplete",milesRadius:"=zMilesRadius",zNgModel:"=ngModel"},template:o}}])}(window,document);