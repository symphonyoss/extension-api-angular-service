/**
 * Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */



/**
 * Author: Kevin Barresi
 * Last Updated: 10/31/2016
 */


'use strict';


export default angular.module('fts.symphony').provider('SymphonyService', SymphonyService);


/** @ngInject */
function SymphonyService() {

  var _load = false;

  return {
    load: enableSymphony,
    $get: service
  };

  function enableSymphony() {
    _load = true;
  }

  /** @ngInject */
  function service($ocLazyLoad, $rootScope, ThemeService, store, $state, $q, FtsModuleStateService, $mixpanel) {

    var _appId = 'DUMMY_SYMPHONY_APP_ID';
    var _loaded = false;
    var _symphonyApiUrl = 'https://symphony.com/resources/api/v1.0/symphony-api.js';
    var _newWindowConfig = {
      canFloat: true
    };

    var _userId = null;
    var _userIdPromise =  $q.defer();

    var tickerControllerName = _appId + ':controller';
    var hashtagControllerName = _appId + ':hashtagController';
    var tickerModuleName = _appId + ':module';
    var hashtagModuleName = _appId + ':hashtagModule';

    var symphonyServices = {
      navService: null,
      uiService: null,
      modulesService: null,
      shareService: null,
      tickerService: null,
      hashtagService: null
    };

    var _initialized = false;

    return {
      available: isAvailable,
      shareArticle: shareArticle,
      loaded: function() { return _loaded; },

      init: init,
      userId: function() { return _userIdPromise.promise; }
    };

    function isAvailable() {
      var url = getParentUrl();
      if (!url)
        return false;

      return (url.indexOf('.symphony.com') !== -1);
    }



    function init() {
      if (!_load || _initialized)
        return;

      store.remove('symphonyProfile');
      _initialized = true;

      $ocLazyLoad.load(_symphonyApiUrl).then(function() {
        SYMPHONY.remote.hello().then(function(connectionData) {

          var theme = (connectionData.themeV2.name) || 'dark';
          var size = (connectionData.themeV2.size) || 'normal';
          loadStyles(theme, size);



          SYMPHONY.application.connect(_appId, ['ui', 'modules', 'applications-nav', 'share'], [ tickerModuleName, hashtagModuleName ]).then(function(response) {

            //subscribe to system services

            symphonyServices.uiService = SYMPHONY.services.subscribe('ui');
            symphonyServices.navService = SYMPHONY.services.subscribe('applications-nav');
            symphonyServices.modulesService = SYMPHONY.services.subscribe('modules');
            symphonyServices.shareService = SYMPHONY.services.subscribe('share');
            symphonyServices.commerceService = SYMPHONY.services.subscribe('commerce');

            //subscribe to the service we created in the Symphony controller app
            symphonyServices.tickerService = SYMPHONY.services.subscribe(tickerControllerName);
            symphonyServices.hashtagService = SYMPHONY.services.subscribe(hashtagControllerName);

            symphonyServices.uiService.listen('themeChangeV2', function(themeV2) {
              var theme = (themeV2.name) || 'dark';
              var size = (themeV2.size) || 'normal';
              loadStyles(theme, size);
            });


            _loaded = true;


            _userId = response.userReferenceId;
            _userIdPromise.resolve(_userId);

            $rootScope.$broadcast('symphonyReady');

          }.bind(this)).catch(function(e) { console.error('Error connecting'); console.error(e); });
        }.bind(this)).catch(function(e) { console.error('Error HELLO'); console.error(e); });
      });
    }


    function shareArticle(article) {

      var articleObject = {
        title: article.title,
        subTitle: '',
        blurb: article.summary,
        date: article.updated,
        publisher: article.sourceTitle + ' powered by FinTech Studios',
        thumbnail: article.imageURL,
        author: article.author,
        href: article.url,
        id: article._id
      };

      if (symphonyServices && symphonyServices.shareService)
        symphonyServices.shareService.share('article', articleObject);
    }

    function openNewWindow() {
      if (!symphonyServices || !symphonyServices.modulesService)
        return;


      var id = 'dummyModuleId_' + (Math.random() * 10000).toFixed(0);
      var url = window.location.href;

      symphonyServices.modulesService.show(id, 'FinTech Studios', tickerControllerName, url, _newWindowConfig);
    }

    function loadStyles(name, size) {
      var b = document.getElementsByTagName('body')[0];
      b.className = name + ' ' + size;
    }
  }

}

function getParentUrl() {
  var isInIframe = (parent !== window),
    parentUrl = null;

  if (isInIframe) {
    parentUrl = document.referrer;
  }

  return parentUrl || '';
}

function extractDomain(url) {
  var domain;
  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf("://") > -1) {
    domain = url.split('/')[2];
  }
  else {
    domain = url.split('/')[0];
  }

  //find & remove port number
  domain = domain.split(':')[0];

  return domain;
}
