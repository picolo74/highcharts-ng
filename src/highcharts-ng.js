/**
 * highcharts-ng
 * @version v1.1.0 - 2017-03-27
 * @link https://github.com/pablojim/highcharts-ng
 * @author Barry Fitzgerald <>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

(function (root, factory) {
	"use strict";

	/*global define*/
	if (typeof define === 'function' && define.amd) {
		define(['angular', 'Highcharts'], factory);  // AMD
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory(require('angular'), require('Highcharts')); // Node
	} else {
		factory(root.angular, root.Highcharts);					// Browser
	}

}(this, function (angular, Highcharts) {
	"use strict";

  angular.module('highcharts-ng', [])
    .component('highchart', {
        bindings: {
            config: '<',
            changeDetection: '<'
          },
          controller: HighChartNGController
    });

  HighChartNGController.$inject = ['$element', '$timeout'];

  function HighChartNGController($element, $timeout) {
    var seriesId = 0;
    var ctrl = this;
    var prevConfig = {};
    var mergedConfig = {};
    var detector = ctrl.changeDetection || angular.equals;
    this.$onInit = function() {
      ctrl.config.getChartObj = function(){
        return ctrl.chart;
      };
      prevConfig = angular.merge({}, ctrl.config);
      mergedConfig = getMergedOptions($element, ctrl.config, seriesId);
      ctrl.chart = new Highcharts[getChartType(mergedConfig)](mergedConfig);

      // Fix resizing bug
      // https://github.com/pablojim/highcharts-ng/issues/550
      var originalWidth = $element[0].clientWidth;
      var originalHeight = $element[0].clientHeight;
      $timeout(function() {
        if ($element[0].clientWidth !== originalWidth || $element[0].clientHeight !== originalHeight) {
          ctrl.chart.reflow();
        }
      }, 0, false);
    };

    this.$doCheck = function() {
      if(!detector(ctrl.config, prevConfig)) {
        prevConfig = angular.merge({}, ctrl.config);
        mergedConfig = getMergedOptions($element, ctrl.config, seriesId);
        var ids = ensureIds(mergedConfig.series, seriesId);
        if (mergedConfig.series) {
          //Remove any missing series
          for (var i = ctrl.chart.series.length - 1; i >= 0; i--) {
            var s = ctrl.chart.series[i];
            if (s.options.id !== 'highcharts-navigator-series' && ids.indexOf(s.options.id) < 0) {
              s.remove(false);
            }
          }
          // Add any new series
          angular.forEach(ctrl.config.series, function(s) {
            if (!ctrl.chart.get(s.id)) {
              ctrl.chart.addSeries(s);
            }
          });
        }
        ctrl.chart.update(mergedConfig, true);
      }
    };

    this.$onDestroy = function() {
        if (ctrl.chart) {
          try{
            ctrl.chart.destroy();
          }catch(ex){
            // fail silently as highcharts will throw exception if element doesn't exist
          }

          $timeout(function(){
            $element.remove();
          }, 0);
        }
      };
    }

  function getMergedOptions(element, config, seriesId) {
    var mergedOptions = {};

    var defaultOptions = {
      chart: {
        events: {}
      },
      title: {},
      subtitle: {},
      series: [],
      credits: {},
      plotOptions: {},
      navigator: {},
    };

    if (config) {
      //check all series and axis ids are set
      if(config.series) {
        ensureIds(config.series, seriesId);
      }

      mergedOptions = angular.merge(defaultOptions, config);
    } else {
      mergedOptions = defaultOptions;
    }
    mergedOptions.chart.renderTo = element[0];

    //check chart type is set
    return mergedOptions;
  }

  var chartTypeMap = {
    'stock': 'StockChart',
    'map':   'Map',
    'chart': 'Chart'
  };

  function getChartType(config) {
    if (config === undefined || config.chartType === undefined) return 'Chart';
    return chartTypeMap[('' + config.chartType).toLowerCase()];
  }

  function ensureIds(series, seriesId) {
    var ids = [];
    angular.forEach(series, function(s) {
      if (!angular.isDefined(s.id)) {
        s.id = 'series-' + seriesId++;
      }
      ids.push(s.id);
    });
    return ids;
  }

}));
