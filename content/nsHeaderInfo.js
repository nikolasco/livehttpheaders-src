//  **** BEGIN LICENSE BLOCK ****
//  Copyright(c) 2002-2003 Daniel Savard.
//
//  LiveHTTPHeaders: this programs have two purpose
//  - Add a tab in PageInfo to show http headers sent and received
//  - Add a tool that display http headers in real time while loading pages
//
//  This program is free software; you can redistribute it and/or modify it under
//  the terms of the GNU General Public License as published by the Free
//  Software Foundation; either version 2 of the License, or (at your option)
//  any later version.
//
//  This program is distributed in the hope that it will be useful, but
//  WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
//  or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
//  more details.
//
//  You should have received a copy of the GNU General Public License along with
//  this program; if not, write to the Free Software Foundation, Inc., 59 Temple
//  Place, Suite 330, Boston, MA 02111-1307 USA
//  **** END LICENSE BLOCK ****

/*
 * Constants
 */
const HEADERINFO_CONTRACTID = "@mozilla.org/js_headerinfo;1";
const HEADERINFO_CID = Components.ID('{d5598f0d-5eba-43bc-b8e1-342a23bce3ea}');
const CATMAN_CONTRACTID = "@mozilla.org/categorymanager;1";
const JS_SCRIPTABLEINPUTSTREAM_CID = "@mozilla.org/scriptableinputstream;1";
const JS_SCRIPTABLEINPUTSTREAM     = "nsIScriptableInputStream";
const JS_ScriptableInputStream = new Components.Constructor
         ( JS_SCRIPTABLEINPUTSTREAM_CID, JS_SCRIPTABLEINPUTSTREAM );
  

/*
 * Utility functions 
 */
function dtb(v,d) {
  var tmp = ("00000000000000000000000000000000"+Math.round(v).toString(2)).slice(-d);
  return tmp.match(/......../g).join(" ");
}
function dth(v,d) {
  return ("000000000000"+Math.round(v).toString(16)).slice(-d);
}


/*
 * Class definitions
 */

var nsHeaderInfo = {
  onStateChange: function(aProg, aRequest, aFlags, aStatus)
  {
    // As we want all headers, we must wait for the 'STOP' state
    if (aFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP &&
        aFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT) {
      try {
        // Only http and https are supported...
        var scheme = aRequest.QueryInterface(Components.interfaces.nsIChannel).URI.scheme;
        if (scheme != 'http' && scheme != 'https') return;

        // We must find the 'DOMWindow' to be able to put our 'HeaderInfo' object in it
        try {
          aRequest.QueryInterface(Components.interfaces.nsIHttpChannel);
        } catch (ex) {
          aRequest.QueryInterface(Components.interfaces.nsIMultiPartChannel);
          aRequest = aRequest.baseChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
        }
        aProg.DOMWindow.headers = new HeaderInfoVisitor(aRequest).getHeaders();
        // We are done with the listener, release it
        aProg.removeProgressListener(this);
      } catch (ex) {}
    }
  },
  onProgressChange: function(aProg, b,c,d,e,f) {},
  onLocationChange: function(aProg, aRequest, aURI) {},
  onStatusChange: function(aProg, aRequest, aStatus, aMessage) {},
  onSecurityChange: function(aWebProgress, aRequest, aState) {},

  onModifyRequest : function (oHttp)
  { 
    try {
      oHttp.QueryInterface(Components.interfaces.nsIRequest);
      //dump("OMR: loadFlags: " + this.dtb(oHttp.loadFlags,32) + "\n");

      // We only need to register a listener if this is a document uri as all embeded object
      // are checked by the same listener (not true for frames but frames are document uri...)
      if ((oHttp.loadFlags & Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI) && 
          oHttp.loadGroup && oHttp.loadGroup.groupObserver) {
        var go = oHttp.loadGroup.groupObserver;
        go.QueryInterface(Components.interfaces.nsIWebProgress);
        go.addProgressListener(this, 0x0b); // 0x2 or 0xff
      }
    } catch (ex) {}
  },
  onExamineResponse : function (oHttp) {},

  addObserver : function (observer)
  {
    this.observers[observer] = observer;
  },

  removeObserver : function (observer)
  {
    delete this.observers[observer];
  },

    observe: function(aSubject, aTopic, aData) {
      if (aTopic == 'http-on-modify-request') {
        aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
        this.onModifyRequest(aSubject);
      //} else if (aTopic == 'http-on-examine-response') {
      //  aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
      //  this.onExamineResponse(aSubject);
      } else if (aTopic == 'app-startup') {
        if ('nsINetModuleMgr' in Components.interfaces) {
	  // Should be an old version of Mozilla (before september 15, 2003
          var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
          netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/request;1", nsHeaderInfo);
          //netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/response;1", nsHeaderInfo);
	} else {
	  // Should be a new version of  Mozilla (after september 15, 2003)
          var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
          observerService.addObserver(nsHeaderInfo, "http-on-modify-request", false);
          //observerService.addObserver(nsHeaderInfo, "http-on-examine-response", false);
	}
        
        // Initialisation of all needed vars 
        this.observers = new Array();
        this.delays    = new Array();
      } else {
        dump("nsHeaderInfo: unknown TOPIC: " + aTopic + "\n");
      }
    },
   
    GetWeakReference : function () {
       dump("nsHeaderInfo: GetWeakReference called!!!\n");
    },

    QueryInterface: function(iid) {
        if (!iid.equals(Components.interfaces.nsISupports) &&
            !iid.equals(Components.interfaces.nsISupportsWeakReference) &&
            //!iid.equals(Components.interfaces.nsIWeakReference) &&
            !iid.equals(Components.interfaces.nsIWebProgressListener) &&
            !iid.equals(Components.interfaces.nsIHttpNotify)) {
            //dump("nsHeaderInfo: QI unknown interface: " + iid + "\n");
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
        return this;
    }
};

function HeaderInfoVisitor (oHttp)
{
  // Keep the Http request object
  this.oHttp = oHttp;

  // headers pseudo-object
  this.headers = new Object();
  this.headers.isFromCache = false;
  this.headers.isFromProxy = false;
  this.headers.request = "";
  this.headers.requestHeaders = null;
  this.headers.response = "";
  this.headers.responseHeaders = null;
  
  // Initialize headers 
  this.visitRequest(this);
  this.visitResponse(this);
}
HeaderInfoVisitor.prototype =
{
  oHttp : null,
  headers : null,

  usedCache : function () {
    // Check to see if the headers are from the cache
    try {
      this.oHttp.QueryInterface(Components.interfaces.nsIRequest);
      if (this.oHttp.loadFlags & Components.interfaces.nsIRequest.VALIDATE_NEVER) {
        return true;
      } else {
        return false;
      }
    } catch (ex) {}
  },
  getHttpResponseVersion: function ()
  {
    var version = "1.z"; // Default value
    // Check if this is Mozilla v1.5a and more
    try {
      var maj = new Object();
      var min = new Object();
      this.oHttp.QueryInterface(Components.interfaces.nsIHttpChannelInternal);
      this.oHttp.getResponseVersion(maj,min);
      version = "" + maj.value + "."+ min.value;
    } catch (ex) {}
    return version;
  },
  getHttpRequestVersion: function (httpProxy)
  {
    var version = "1.x"; // Default value for direct HTTP and proxy HTTP
    // Check if this is Mozilla v1.5a and more
    try {
      var maj = new Object();
      var min = new Object();
      this.oHttp.QueryInterface(Components.interfaces.nsIHttpChannelInternal);
      this.oHttp.getRequestVersion(maj,min);
      version = "" + maj.value + "."+ min.value;
    } catch (ex) {
      try {
        // This code is based on netwerk/protocol/http/src/nsHttpHandler.cpp (PrefsChanged)
        var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        pref = pref.getBranch("");
        // Now, get the value of the HTTP version fields
        if (httpProxy) {
          var tmp = pref.getCharPref("network.http.proxy.version");
          if (tmp == "1.1") version = tmp;
        } else {
          var tmp = pref.getCharPref("network.http.version");
          if (tmp == "1.1" || tmp == "0.9") version = tmp;
        }
      } catch (ex) {}
    }
    return version;
  },
  useHttpProxy : function (uri)
  {
    // This code is based on netwerk/base/src/nsProtocolProxyService.cpp (ExamineForProxy)
    try {
      var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService().QueryInterface(Components.interfaces.nsIProtocolProxyService);

      // If a proxy is used for this url, we need to keep the host part
      if (pps.proxyEnabled && (pps.examineForProxy(uri)!=null)) {
        // Proxies are enabled.  Now, check if it is an HTTP proxy.
        var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        pref = pref.getBranch("");
        // Now, get the value of the HTTP proxy fields
        var http_host = pref.getCharPref("network.proxy.http");
        var http_port = pref.getIntPref("network.proxy.http_port");
        // network.proxy.http_port network.proxy.http
        if (http_host && http_port>0) {
          return true; // HTTP Proxy
        }
      }
      return false; // No proxy or not HTTP Proxy
    } catch (ex) {
      return null; // Error
    }
  },

  readLine : function(stream) {
    var line = "";
    var size = stream.available();
    for (var i=0; i<size; i++) {
      var c = stream.read(1);
      if (c == '\r') {
      } else if (c == '\n') {
        break;
      } else {
        line += c;
      }
    }
    return line;
  },
  visitPostHeaders: function(visitor) {
    // Get the headers from postData stream if present
    try {
      // Must change HttpChannel to UploadChannel to be able to access post data
      this.oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
      // Get the post data stream
      if (this.oHttp.uploadStream) {
        try {
          // Must check if there is headers in the stream
          this.oHttp.uploadStream.QueryInterface(Components.interfaces.nsIMIMEInputStream);
          // Must change to SeekableStream to be able to rewind the stream
          this.oHttp.uploadStream.QueryInterface(Components.interfaces.nsISeekableStream);
          this.oHttp.uploadStream.seek(0,0);
 
          // Need to create a seekable stream to be able to read the stream in javascript
          var stream = new JS_ScriptableInputStream();
          stream.init(this.oHttp.uploadStream);

          // Now we can start to get the headers
          var line = this.readLine(stream);
          while(line) {
            var tmp = line.split(/:\s?/);
            visitor.visitHeader(tmp[0],tmp[1]);
            line = this.readLine(stream);
          }
        } catch (ex) {} 
        // Need to close the stream after use
        finally { this.oHttp.uploadStream.close(); stream.close(); }
      }
    } catch (e) {}
  },

  visitHeader : function (name, value)
  {
    this.theaders[name] = value;
  },
  visitRequest : function ()
  {
    this.theaders = new Array();
    var uri, note, ver;
    try {
      // Get the URL and get parts
      // Should I use  this.oHttp.URI.prePath and this.oHttp.URI.path to make
      // the URL ?  I still need to remove the '#' sign if present in 'path'
      var url = String(this.oHttp.URI.asciiSpec);

      // If an http proxy is used for this url, we need to keep the host part
      this.headers.isFromProxy = this.useHttpProxy(this.oHttp.URI);
      if (this.headers.isFromProxy) {
        uri = url.match(/^(.*?\/\/[^\/]+\/[^#]*)/)[1];
        ver = this.getHttpRequestVersion(true);
      } else {
        uri = url.match(/^.*?\/\/[^\/]+(\/[^#]*)/)[1];
        ver = this.getHttpRequestVersion(false);
      }
    } catch (ex) {
      uri = String(this.oHttp.URI.asciiSpec);
      ver = "1.x";
    }
    this.headers.request = this.oHttp.requestMethod + " " + uri + " HTTP/" + ver;
    this.oHttp.visitRequestHeaders(this);
    this.visitPostHeaders(this);
     
    this.headers.requestHeaders = this.theaders;
  },
  visitResponse : function ()
  {
    var ver = this.getHttpResponseVersion();
    this.theaders = new Array();
    this.headers.response = "HTTP/" + ver + " " + this.oHttp.responseStatus + " " + this.oHttp.responseStatusText;
    this.oHttp.visitResponseHeaders(this);
    this.headers.responseHeaders = this.theaders;

    // Check if we received theses headers from the cache or not
    this.headers.isFromCache = this.usedCache();
  },
  getHeaders : function()
  {
    return this.headers;
  }
}


/*
 * Objects
 */

/* nsHeaderInfo Module (for XPCOM registration) */
var nsHeaderInfoModule = {
    firstTime : true,
    registerSelf: function(compMgr, fileSpec, location, type) {
      //dump("nsHeaderInfo: registerSelf called!\n");
      if (this.firstTime) {
        this.firstTime = false;
        throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
      }
      var compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
      compMgr.registerFactoryLocation(HEADERINFO_CID, 
                                      "nsHeaderInfo JS component", 
                                      HEADERINFO_CONTRACTID, 
                                      fileSpec, location, type);

      var catman = Components.classes[CATMAN_CONTRACTID].getService(Components.interfaces.nsICategoryManager);
      catman.addCategoryEntry("app-startup", "HeaderInfo",
                              HEADERINFO_CONTRACTID,true, true);
    },

    unregisterSelf: function(compMgr, fileSpec, location) {
      // Remove the auto-startup
      var compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

      compMgr.unregisterFactoryLocation(HEADERINFO_CID, fileSpec);
      var catman = Components.classes[CATMAN_CONTRACTID].getService(Components.interfaces.nsICategoryManager);
      catman.deleteCategoryEntry("app-startup", HEADERINFO_CONTRACTID, true);
    },

    getClassObject: function(compMgr, cid, iid) {
        if (!cid.equals(HEADERINFO_CID))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        if (!iid.equals(Components.interfaces.nsIFactory))
            throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

        return nsHeaderInfoFactory;
    },

    canUnload: function(compMgr) { return true; }
};

/* nsHeaderInfo Class Factory */
var nsHeaderInfoFactory = {
    createInstance: function(outer, iid) {
        if (outer != null) {
            throw Components.results.NS_ERROR_NO_AGGREGATION;
        }
    
        if (!iid.equals(Components.interfaces.nsISupports) &&
            !iid.equals(Components.interfaces.nsIObserver)) {
            throw Components.results.NS_ERROR_INVALID_ARG;
        }
        return nsHeaderInfo;
    }
}

/*
 * Functions
 */

/* module initialisation */
function NSGetModule(comMgr, fileSpec) { return nsHeaderInfoModule; }

