function bungie() {
  // private vars
  var domain = 'bungie.net';
  var url = 'https://www.bungie.net/';
  var apikey = '57c5ff5864634503a0340ffdfbeb20c0';

  var systemIds = {};
  var membershipId = 0;
  var characterIds = [];

  var active = {id: 'loading'};

  if (!isChrome){
	var _token, id = 0;
	window.requests = {};  
	window.addEventListener("message", function(event) {
		var reply = event.data;
		var response = JSON.parse(reply.response);
		requests[reply.id].complete(response.Response, response);
	}, false);  
  }

  // private methods
  function _getAllCookies(callback) {
  	if (isChrome){
		chrome.cookies.getAll({ domain: '.' + domain }, function(){
	      callback.apply(null, arguments);
	    });	
	}    
  }

  function _getCookie(name, callback) {
    _getAllCookies(function(cookies){
      var c = null;
      for(var i = 0, l = cookies.length; i < l; ++i){
        if(cookies[i].name === name){
          c = cookies[i];
          break;
        }
      }
      callback(c ? c.value : null);
    });
  }

  function _getToken(callback) {
    _getCookie('bungled', function(token) {
      callback(token);
    });
  }

  function _request(opts) {
  	if (isChrome){
		var r = new XMLHttpRequest();
	    r.open(opts.method, url + "Platform" + opts.route, true);
	    r.setRequestHeader('X-API-Key', apikey);
	    r.onload = function() {
		  var response = this.response;
		  try {
		  	response = JSON.parse(this.response);
		  }catch(e){}		  
	      if (this.status >= 200 && this.status < 400) {	        		
		        if(response.ErrorCode === 36){ setTimeout(function () { _request(opts); }, 1000); }
		        else { opts.complete(response.Response, response); }			
	      } 
		  else {
	       	    opts.complete({error: 'network error:' + this.status}, response);
	      }
	    };
	
	    r.onerror = function() { opts.complete({error: 'connection error'}); };
	
	    _getToken(function(token) {
	      if(token != null) {
	        r.withCredentials = true;
	        r.setRequestHeader('x-csrf', token);
	        r.send(JSON.stringify(opts.payload));
	      } else {
	        opts.complete({error: 'cookie not found'});
	      }
	    });	
	}
	else {
		var event = document.createEvent('CustomEvent');
		opts.route = url + "Platform" + opts.route;
		event.initCustomEvent("request-message", true, true, { id: ++id, opts: opts });
		requests[id] = opts;
		document.documentElement.dispatchEvent(event);	
	}
  }

  // privileged methods
  this.setsystem = function(type) {
    active = systemIds.xbl
    if(type === 'PSN')
      active = systemIds.psn;
  }
  this.gamertag = function() {
    return active.id;
  }
  this.system = function() {
    return systemIds;
  }

  this.user = function(callback) {
    _request({
      route: '/User/GetBungieNetUser/',
      method: 'GET',
      complete: function(res, response) {
		if (response.ErrorCode && response.ErrorCode > 1){			
			callback({error: response.Message, code: response.ErrorCode});
         	return;
		}
		else if (res == undefined) {			
          callback({error: 'no response'})
          return;
		}

        systemIds.xbl = {id: res.gamerTag, type: 1};
        systemIds.psn = {id: res.psnId, type: 2};

        active = systemIds.xbl;

        if(res.psnId)
          active = systemIds.psn;

        callback(res);
      }
    });
  }
  this.search = function(callback) {
    _request({
      route: '/Destiny/SearchDestinyPlayer/' + active.type + '/' + active.id + '/?definitions=true',
      method: 'GET',
      complete: function(membership) {
        if(membership[0] === undefined) {
          //console.log('error finding bungie account!', membership)
          callback({error: true})
          return;
        }
        membershipId = membership[0].membershipId;
        _request({
          route: '/Destiny/Tiger' + (active.type == 1 ? 'Xbox' : 'PSN') +
                  '/Account/' + membershipId + '/?definitions=true',
          method: 'GET',
          complete: callback
        });
      }
    });
  }
  this.vault = function(callback) {
    _request({
      route: '/Destiny/' + active.type + '/MyAccount/Vault/?definitions=true',
      method: 'GET',
      complete: callback
    });
  }
  this.inventory = function(characterId, callback) {
    _request({
      route: '/Destiny/' + active.type +
              '/Account/' + membershipId +
              '/Character/' + characterId +
              '/Inventory/?definitions=true',
      method: 'GET',
      complete: callback
    });
  }
  this.transfer = function(characterId, itemId, itemHash, amount, toVault, callback) {
    _request({
      route: '/Destiny/TransferItem/',
      method: 'POST',
      payload: {
        characterId: characterId,
        membershipType: active.type,
        itemId: itemId,
        itemReferenceHash: itemHash,
        stackSize: amount,
        transferToVault: toVault
      },
      complete: callback
    });
  }
  this.equip = function(characterId, itemId, callback) {
    _request({
      route: '/Destiny/EquipItem/',
      method: 'POST',
      payload: {
        membershipType: active.type,
        characterId: characterId,
        itemId: itemId
      },
      complete: callback
    })
  }
  // this function works and returns a behemoth response. very useful/scary.
  // .equipResults for more information on item equip messages
  // .character.inventory.buckets -useful to resync data maybe?
  // .summary - useful if we want to update character level/emblem/etc
  this.equipall = function(characterId, itemIds, callback) {
    _request({
      route: '/Destiny/EquipItems/',
      method: 'POST',
      payload: {
        membershipType: active.type,
        characterId: characterId,
        itemIds: itemIds
      },
      complete: callback
    })
  }
  this.getUrl = function(){
  	return url;
  }
}
