/*global angular*/
(function withAngular(angular) {
  'use strict';

  var cardflowDirective = function cardflowDirective($log, $window, $swipe) {

    var parseElementTransform = function parseElementTransform(element) {
        var computedStyle = $window.getComputedStyle(element)
          , transform
          , theMatrix;

        if (computedStyle) {

          ['moz', 'o', 'webkit', 'ms', ''].forEach(function forEachBrowserPrefix(aPrefix) {
            var property;

            if (aPrefix === '') {

              property = 'transform';
            } else {

              property = '-' + aPrefix + '-transform';
            }

            if (computedStyle[property]) {

              transform = computedStyle[property];
            }
          });

          if (transform) {

            theMatrix = transform.match(/-*\d+/g);
            if (theMatrix &&
              theMatrix.length === 6) {

              return Number(theMatrix[4]);
            }
          }
        }

        return 0;
      }
      , translateElementByPosition = function translateElementByPosition(element, xPosition) {
        var computedStyle = $window.getComputedStyle(element)
          , transform
          , prefix
          , theMatrix
          , cssTrasformation = {};

        if (computedStyle) {

          ['moz', 'o', 'webkit', 'ms', ''].forEach(function forEachBrowserPrefix(aPrefix) {
            var property;

            if (aPrefix === '') {

              property = 'transform';
            } else {

              property = '-' + aPrefix + '-transform';
            }
            if (computedStyle[property]) {

              transform = computedStyle[property];
              prefix = aPrefix;
            }
          });

          if (transform) {

            theMatrix = transform.match(/\d+/g);
            if (theMatrix &&
              theMatrix.length === 6) {

              theMatrix = theMatrix.map(function mappingFunction(anElement) {

                return Number(anElement);
              });
            } else {

              theMatrix = [1, 0, 0, 1, 0, 0];
            }
          } else {

            theMatrix = [1, 0, 0, 1, 0, 0];
          }
          theMatrix[4] = xPosition;

          if (prefix) {

            cssTrasformation['-' + prefix + '-transform'] = 'matrix(' + theMatrix.join(',') + ')';
          } else {

            cssTrasformation.transform = 'matrix(' + theMatrix.join(',') + ')';
          }
          return cssTrasformation;
        }
      }
      , cardflowLinkingFunction = function cardflowLinkingFunction($scope, element) {

        var wrapperElement = angular.element(element.find('div')[0])
          , containerElement = angular.element(wrapperElement.find('div')[0])
          , childrenElements
          , startingSwipePoint
          , initialTrasformOffset
          , lastTime = 0
          , onSwipeStart = function onSwipeStart(coords) {

            if (coords &&
              coords.x) {

              startingSwipePoint = coords.x;
              initialTrasformOffset = parseElementTransform(containerElement[0]);
            }
          }
          , onSwipe = function onSwipe(coords) {

            $window.requestAnimationFrame(function onSwipeAnimationFrame(currentTime) {

              if (currentTime - lastTime < 17 &&
                coords &&
                coords.x) {

                var wrapperElementWidth = wrapperElement[0].offsetWidth
                  , distance = initialTrasformOffset - (startingSwipePoint - coords.x)
                  , totalWidth = $scope.cardflowCtrl.ngModel.cardWidth * childrenElements.length - wrapperElementWidth;

                if (distance < 0 &&
                  (distance > -totalWidth || $scope.cardflowCtrl.ngModel.current === $scope.cardflowCtrl.ngModel.cards.length - 1)) {

                  $scope.$apply(function doUpdate() {
                    var css = translateElementByPosition(containerElement[0], distance);

                    if (css) {

                      containerElement.css(css);
                    }
                  });
                }
                $log.debug('Animation done');
              } else {

                $log.debug('Skipped animation');
              }

              lastTime = currentTime;
            });
          }
          , onCardSelected = function onCardSelected() {
            var ngElementSelected = angular.element(this);

            if (childrenElements) {

              childrenElements.removeClass('cardflow-active');
            }

            ngElementSelected.addClass('cardflow-active');
            $scope.cardflowCtrl.ngModel.selectedCard = ngElementSelected;
          }
          , checkIfCardsAreChanged = function checkIfCardsAreChanged() {

            return containerElement.children().length;
          }
          , onCardsChanged = function onCardsChanged() {
            var totalWidth
              , computedChildrenStyle
              , childrenWidth
              , childrenMarginRight;

            childrenElements = containerElement.children();
            childrenElements.bind('click', onCardSelected);
            if ($scope.cardflowCtrl.ngModel.cards &&
              $scope.cardflowCtrl.ngModel.cards.length > 0 &&
              childrenElements &&
              childrenElements.length > 0) {

              computedChildrenStyle = $window.getComputedStyle(childrenElements[0]);
              childrenWidth = parseInt(computedChildrenStyle.width, 10);
              childrenMarginRight = parseInt(computedChildrenStyle.marginRight, 10);
              $scope.cardflowCtrl.ngModel.cardWidth = childrenWidth + childrenMarginRight;
              if ($scope.cardflowCtrl.ngModel.cardWidth === 0) {

                $scope.cardflowCtrl.ngModel.cardWidth = childrenElements[0].offsetWidth;
              }

              totalWidth = $scope.cardflowCtrl.ngModel.cardWidth * childrenElements.length;
              containerElement.css({
                'width': totalWidth + 'px'
              });
              $scope.cardflowCtrl.ngModel.pageSize = Math.floor(wrapperElement[0].clientWidth / $scope.cardflowCtrl.ngModel.cardWidth);
              $scope.cardflowCtrl.ngModel.increment = $scope.cardflowCtrl.ngModel.pageSize;
            }
          }
          , checkIfCurrentIsChanged = function checkIfCurrentIsChanged() {

            return $scope.cardflowCtrl.ngModel.current;
          }
          , onCurrentChanged = function onCurrentChanged(newValue) {
            var css
              , newPosition;

            if ($scope.cardflowCtrl.ngModel.cardWidth) {

              newPosition = $scope.cardflowCtrl.ngModel.cardWidth * newValue;
              css = translateElementByPosition(containerElement[0], -newPosition);
              containerElement.css(css);
            }
          }
          , unregisterWatcherForCards = $scope.$watch(checkIfCardsAreChanged, onCardsChanged)
          , unregisterWatcherCurrentSelected = $scope.$watch(checkIfCurrentIsChanged, onCurrentChanged);

        $swipe.bind(wrapperElement, {
          'start': onSwipeStart,
          'move': onSwipe
        });

        $scope.$on('$destroy', function unregisterListeners() {

          unregisterWatcherForCards();
          unregisterWatcherCurrentSelected();
          childrenElements.off('click', onCardSelected);
        });
      }
      , cardflowController = function cardflowController($rootScope, $scope) {

        var that = this
          , onNewCardsCome = function onNewCardsCome(eventInformations, payload) {

            if (payload &&
              payload.cards) {

              that.ngModel.cards = payload.cards;
            }
          }
          , checkIfSelectionIsChanged = function checkIfSelectionIsChanged() {

            return that.ngModel.selectedCard;
          }
          , publishSelectionChanged = function publishSelectionChanged() {

            $rootScope.$emit('cardflow:new-selection', that.ngModel.selectedCard);
          }
          , unregisterOnNewCardsCome = $rootScope.$on('cardflow:new-cards', onNewCardsCome)
          , unregisterChangeSelectionWatcher = $scope.$watch(checkIfSelectionIsChanged, publishSelectionChanged);

        that.ngModel = that.ngModel || {};
        that.ngModel.cardWidth = 0;
        that.ngModel.cards = that.ngModel.cards || [];
        that.ngModel.selectedCard = {};
        that.ngModel.current = that.ngModel.current || 0;
        that.ngModel.increment = 1;

        $scope.$on('$destroy', function unregisterListeners() {

          unregisterOnNewCardsCome();
          unregisterChangeSelectionWatcher();
        });
      };

    return {
      'restrict': 'E',
      'template': [
        '<div class="cardflow-wrapper" ',
          'ng-swipe-left="cardflowCtrl.swipeLeft($event)" ',
          'ng-swipe-right="cardflowCtrl.swipeRight($event)">',
          '<div class="cardflow-container" ng-transclude>',
          '</div>',
        '</div>'].join(''),
      'transclude': true,
      'require': 'ngModel',
      'scope': {},
      'bindToController': {
        'ngModel': '=?',
        'current':'=?'
      },
      'controller': ['$rootScope', '$scope', cardflowController],
      'link': cardflowLinkingFunction,
      'controllerAs': 'cardflowCtrl'
    };
  };

  angular.module('angular-cardflow', ['ngTouch'])
    .directive('cardflow', ['$log', '$window', '$swipe', cardflowDirective]);
}(angular));
