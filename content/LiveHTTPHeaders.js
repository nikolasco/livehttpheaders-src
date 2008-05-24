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

// To enable dumpall: browser.dom.window.dump.enabled = true

// To use LiveHTTPHeaders's headers, call addObserver(obj) and removeObserver(obj)
// This will call obj.observeGRequest and obj.observeResponse for each request
// - observeRequest(uri, request)  // This doesn't exist !!!  It is for future
// - observeGRequest(uri, method)  // This is only for Generator
// - observeResponse(uri, request, response, postData, isRedirect)

var oHeaderInfoLive;
function startHeaderInfoLive() {
  oHeaderInfoLive = new HeaderInfoLive();
  oHeaderInfoLive.start();
  addToListener(oHeaderInfoLive)
}
function stopHeaderInfoLive() {
  removeFromListener(oHeaderInfoLive)
  oHeaderInfoLive.stop();
  oHeaderInfoLive = null;
}

function addToListener(obj)
{
  // Register new request and response listener
  if ('nsINetModuleMgr' in Components.interfaces) {
    // Should be an old version of Mozilla/Phoenix (before september 15, 2003)
    var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
    netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/request;1", obj);
    netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/response;1", obj)
  } else {
    // Should be a new version of  Mozilla/Phoenix (after september 15, 2003)
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(obj, "http-on-modify-request", false);
    observerService.addObserver(obj, "http-on-examine-response", false);
  }
}
function removeFromListener(obj)
{
  // Unregistering listener
  if ('nsINetModuleMgr' in Components.interfaces) {
    // Should be an old version of Mozilla/Phoenix (before september 15, 2003)
    var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
    netModuleMgr.unregisterModule("@mozilla.org/network/moduleMgr/http/request;1", obj);
    netModuleMgr.unregisterModule("@mozilla.org/network/moduleMgr/http/response;1", obj);
  } else {
    // Should be a new version of  Mozilla/Phoenix (after september 15, 2003)
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(obj, "http-on-modify-request");
    observerService.removeObserver(obj, "http-on-examine-response");
  }
}

function HeaderInfoLive()
{
  this.test = new Array(); //Test
  this.data = new Array(); //Data for each row
  this.type = new Array(); //Type of data (request, post, response, url, etc)
  this.style= new Array(); //Style of data (request, post, response, url, etc)
  this.check= new Array(); //This is an array of url to check (modify headers)
  this.names= new Array(); //Names for tree's images
  this.atoms= new Array(); //Atoms for tree's styles
  this.observers = new Array(); // LiveHTTPHeaders's Observers
 
  // Read preferences
  this.pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  this.lpref = this.pref.getBranch("extensions.livehttpheaders."); // Live
  this.mpref = this.pref.getBranch("");                            // Mozilla

  this.usestyle= this.getIntPref(this.lpref, "style", 0); // Use style sheet
  this.mode    = this.getIntPref(this.lpref, "mode", 1);    // Post capture mode
  this.usetab  = this.getBoolPref(this.lpref, "tab", false); // Tab mode
  this.usefilter  = this.getBoolPref(this.lpref, "filter", false); // Filter mode
  this.filterRegexp  = this.getCharPref(this.lpref, "filterRegexp",'/$|\.html$'); // Filter mode
  this.useexclude  = this.getBoolPref(this.lpref, "exclude", false); // exclude mode
  this.excludeRegexp  = this.getCharPref(this.lpref, "excludeRegexp",'\.gif$|\.jpg$|\.ico$|\.css$|\.js$'); // exclude mode
}
HeaderInfoLive.prototype =
{
  // Constants
  // Type
  URL : 1,
  REQUEST : 2,
  POSTDATA : 3,
  RESPONSE : 4,
  REQSPACE : 5,
  RESSPACE : 6,
  SEPARATOR : 7,
  // Style
  FIRST : 100,
  MID   : 200,
  LAST  : 300,
  SINGLE: 400,
  // Strings
  SEPSTRING: "----------------------------------------------------------\r\n",
 
  test : null, 
  oDump: null,
  isCapturing: true,

  // Tree interface
  rows: 0,
  tree: null,

  // Horizontal scrolling
  hScrollBar: null,
  hScrollPos: 0,
  hScrollMax: 0,
  datapresent: "datapresent",

  set rowCount(c) { throw "rowCount is a readonly property"; },
  get rowCount() { return this.rows; },
  setTree: function(tree) { this.tree = tree; },
  getCellText: function(row, column) {
    //return this.data[row].match(/^.*/);
    return this.data[row].substr(this.hScrollPos).match(/^.*/);
  },
  setCellText: function(row, column, text) { },
  getRowProperties: function(row, props) { },
  getCellProperties: function(row, col, props) {
    if (this.usestyle) {
      props.AppendElement(this.atoms[this.type[row]+this.style[row]]);
    }
  },
  getColumnProperties: function(column, elem, prop) { },
  isContainer: function(index) { return false; },
  isContainerOpen: function(index) { },
  isContainerEmpty: function(index) { return false; },
  isSeparator: function(index) { 
    if (this.usestyle) {
      return false ; 
    } else {
      return this.type[index]==this.SEPARATOR; 
    }
  },
  isSorted: function() { },
  canDropOn: function(index) { return false; },
  canDropBeforeAfter: function(index, before) { return false; },
  drop: function(row, orientation) { return false; },
  getParentIndex: function(index) { return 0; },
  hasNextSibling: function(index, after) { 
    if (this.type[index+1] == this.POSTDATA) return true;
    return false; 
  },
  getLevel: function(index) { 
    if (this.type[index] == this.POSTDATA) return 1;
    return 0; 
  },
  getImageSrc: function(row, column) { },
  getProgressMode: function(row, column) { },
  getCellValue: function(row, column) { },
  toggleOpenState: function(index) { },
  cycleHeader: function(col, elem) { },
  selectionChanged: function() { },
  cycleCell: function(row, column) { },
  isEditable: function(row, column) { return false; },
  performAction: function(action) { },
  performActionOnRow: function(action, row) { },
  performActionOnCell: function(action, row, column) { },

  // Tree utility functions
  addRow: function(row, type) { 
    // Compute the style
    var style;
    if (this.rows>0) {
      var ptype = this.type[this.rows-1];
      var pstyle = this.style[this.rows-1];
      if (type != ptype) {
        // We have a new type.  The line above may be single or last.
        if (pstyle == this.FIRST) {
          pstyle = this.SINGLE;
	} else {
	  pstyle = this.LAST;
        }
        this.style[this.rows-1] = pstyle; // Update the style for the line above
        style = this.FIRST;
      } else {
        // Same type.  This line should be middle
        style = this.MID;
      }
    } else {
        // The first line.  No doubts, it should be of style FIRST.
        style = this.FIRST;
        document.getElementById(this.datapresent).removeAttribute('disabled');
    }

    // Add the row
    this.type.push(type);
    this.style.push(style);
    this.rows = this.data.push(row);
    if (row.length > this.hScrollMax) this.sethScroll(row.length);

  }, //A
  rowCountChanged: function(index, count) //A
  {
    var lvr = this.tree.getLastVisibleRow();
    this.tree.rowCountChanged(index, count);
    // If the last line of the tree is visible on screen, we will autoscroll
    if (lvr >= index) this.tree.ensureRowIsVisible(this.rows-1);
  },

  // Horizontal scrolling functions
  sethScroll: function(max) {
    // Set the new maximum value and page increment to be 5 steps
    var maxpos = this.hScrollBar.attributes.getNamedItem("maxpos");
    var pageincrement=this.hScrollBar.attributes.getNamedItem("pageincrement");
    maxpos.value = (max>2 ? max-3 : 0);
    pageincrement.value = max/5;
    this.hScrollMax = max;
  },
  hScrollHandler: function() {
    // Need to use global oHeaderInfoLive object  this because 'this'
    // doesn't seem to be available.
    var base = oHeaderInfoLive;
    var curpos = base.hScrollBar.attributes.getNamedItem("curpos").value;
    if (curpos != base.hScrollPos) {
      base.hScrollPos = curpos;
      base.tree.invalidate();
    }
  },

  // Select and copy function
  onselect: function()
  {
    var selection = this.oDump.view.selection;
    // Look if there is an URL block selected
    if (selection.count == 1 && this.type[selection.currentIndex]!=this.SEPARATOR) {
      document.getElementById("headerinfo-replay").disabled = false;
    } else {
      document.getElementById("headerinfo-replay").disabled = true;
    }
  },

  selectBlock: function()
  {
    var selection = this.oDump.view.selection;
    var index = selection.currentIndex;
    if (index>=0 && this.type[index]!=this.SEPARATOR) {
      var first = index;
      var last = index;
      while(first>0 && this.type[first-1]!=this.SEPARATOR) first--;
      while(last<this.rowCount && this.type[last+1]!=this.SEPARATOR) last++;
      selection.rangedSelect(first,last,false);
    }
  },

  selectAll : function()
  {
    return this.oDump.view.selection.selectAll();
  },
 
  toClipboard: function(data) {
    if (data) {
      // clipboard helper
      try
      {
        const clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
	clipboardHelper.copyString(data);
      } catch(e) {
        // do nothing, later code will handle the error
	dump("Unable to get the clipboard helper\n");
      }
    }
  },
  
  copy: function()
  {
    this.toClipboard(this.getSelection());
  },
 
  getSelection: function()
  {
    var selection = this.oDump.view.selection;
    var data = "", rStart = {}, rEnd = {};
    var ranges = selection.getRangeCount();
    for (var range=0; range<ranges; range++) {
      selection.getRangeAt(range, rStart, rEnd);
      if (rStart.value >=0 && rEnd.value >=0) {
        for (var row=rStart.value; row<=rEnd.value; row++) {
	  if (this.type[row]==this.SEPARATOR) {
	    data += this.SEPSTRING; // This is a separator
	  } else {
            data += this.data[row];
	  }
	}
      }
    }
    return data;
  },
  
  getAll: function()
  { 
    var data = "";
    for (var row=0; row<this.rows; row++) {
      if (this.type[row]==this.SEPARATOR) {
	data += this.SEPSTRING; // This is a separator
      } else {
        data += this.data[row];
      }
    }
    return data;
  },

  // Preferences function for LiveHTTPHeaders
  getIntPref : function(branch, name, value) {
    if (branch.prefHasUserValue(name)) {
      return branch.getIntPref(name);
    } else {
      this.setIntPref(branch, name, value);
      return value;
    }
  },
  setIntPref : function(branch, name, value) {
    branch.setIntPref(name, value);
  },
  getBoolPref : function(branch, name, value) {
    if (branch.prefHasUserValue(name)) {
      return branch.getBoolPref(name);
    } else {
      this.setBoolPref(branch, name, value);
      return value;
    }
  },
  setBoolPref : function(branch, name, value) {
    branch.setBoolPref(name, value);
  },

  getCharPref : function(branch, name, value) {
    if (branch.prefHasUserValue(name)) {
      return branch.getCharPref(name);
    } else {
      this.setCharPref(branch, name, value);
      return value;
    }
  },
  setCharPref : function(branch, name, value) {
    branch.setCharPref(name, value);
  },

  // Initialisation and termination functions
  start : function()
  {
    this.oDump = document.getElementById("headerinfo-dump");
    this.oDump.treeBoxObject.view = this;
 
    // Set configuration tab
    try {
        document.getElementById("headerinfo-mode").selectedIndex=this.mode;
        document.getElementById("headerinfo-style").checked=this.usestyle;
        document.getElementById("headerinfo-tab").checked=this.usetab;
        document.getElementById("headerinfo-filter").checked=this.usefilter;
        document.getElementById("headerinfo-filterRegexp").value=this.filterRegexp;
        document.getElementById("headerinfo-exclude").checked=this.useexclude;
        document.getElementById("headerinfo-excludeRegexp").value=this.excludeRegexp;
    } catch (ex) {}

    // Set scrollbar
    this.hScrollBar = document.getElementById("headerinfo-dump-scroll");
    setInterval(this.hScrollHandler,100);

    this.initAtoms();
  },

  initAtoms : function()
  {
    // Pre-generate the atoms
    var aserv=Components.classes["@mozilla.org/atom-service;1"].
              createInstance(Components.interfaces.nsIAtomService);
    this.atoms[this.URL + this.SINGLE] = aserv.getAtom("URL");
    this.atoms[this.REQUEST + this.FIRST] = aserv.getAtom("FirstRequest");
    this.atoms[this.REQUEST + this.MID] = aserv.getAtom("MidRequest");
    this.atoms[this.REQUEST + this.LAST] = aserv.getAtom("LastRequest");
    this.atoms[this.REQUEST + this.SINGLE] = aserv.getAtom("SingleRequest");
    this.atoms[this.POSTDATA+ this.FIRST] = aserv.getAtom("FirstPostData");
    this.atoms[this.POSTDATA+ this.MID] = aserv.getAtom("MidPostData");
    this.atoms[this.POSTDATA+ this.LAST] = aserv.getAtom("LastPostData");
    this.atoms[this.POSTDATA+ this.SINGLE] = aserv.getAtom("SinglePostData");
    this.atoms[this.RESPONSE+ this.FIRST] = aserv.getAtom("FirstResponse");
    this.atoms[this.RESPONSE+ this.MID] = aserv.getAtom("MidResponse");
    this.atoms[this.RESPONSE+ this.LAST] = aserv.getAtom("LastResponse");
    this.atoms[this.RESPONSE+ this.SINGLE] = aserv.getAtom("SingleResponse");
    this.atoms[this.REQSPACE+ this.SINGLE] = aserv.getAtom("SpaceRequest");
    this.atoms[this.RESSPACE+ this.SINGLE] = aserv.getAtom("SpaceResponse");
    this.atoms[this.SEPARATOR + this.SINGLE] = aserv.getAtom("Separator");
    this.atoms[this.SEPARATOR + this.FIRST] = aserv.getAtom("Separator");
  },

  generateNamesAndAtoms : function(as, typeno, typename) {
    this.names[typeno+this.FIRST] = "First" + typename;
    this.atoms[typeno+this.FIRST] = as.getAtom(this.names[typeno+this.FIRST]);
  },

  stop : function()
  {
    this.oDump.treeBoxObject.view = null;
    this.oDump = null;
    this.hScrollBar = null;
  },

  // This is the observerService's observe listener.
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == 'http-on-modify-request') {
      aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
      this.onModifyRequest(aSubject);
    } else if (aTopic == 'http-on-examine-response') {
      aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
      this.onExamineResponse(aSubject);
    }
  },

  // Add a new LiveHTTPHeaders's observer
  addObserver: function(obj) {
    this.observers.push(obj);
  },
  // Remove a LiveHTTPHeaders's observer
  removeObserver: function(obj) {
    for (observer in this.observers) {
      if (this.observers[observer] == obj) {
        delete this.observers[observer];
      }
    }
  },

  // Header Info Lives functions
  capture : function(flag)
  {
    this.isCapturing = flag;
  },

  clear : function()
  {
    var oldrows = this.rows;
    this.rows = 0;
    this.data = new Array();
    this.type = new Array();
    this.style= new Array();
    this.rowCountChanged(0,-oldrows);
    this.hScrollMax = 0;
    this.sethScroll(0);
    document.getElementById(this.datapresent).setAttribute('disabled','true');
  },

  saveAll: function(title)
  {
    saveAs(this.getAll(),title);
  },
  
  saveSelection: function(title)
  {
    saveAs(this.getSelection(),title);
  },

  replay: function()
  {
    var method=null, url=null, version=null, request=null, postdata=null;
    
    var selection = this.oDump.view.selection;
    var index = selection.currentIndex;
    if (index>=0 && this.type[index]!=this.SEPARATOR) {
      var first = index;
      var data;
      while(first>0 && this.type[first-1]!=this.SEPARATOR) first--;
      for (var i=first; this.type[i]!=this.SEPARATOR; i++) {
        data = this.data[i];
        //dump("DATA: " + data +"\n");
        switch(this.type[i]) {
        case this.URL: url = data;
                       break;
        case this.REQUEST: 
                       if (!method) {
                         var tmp = data.match(/^(\S+).*\/(\S+)/);
                         method = tmp[1];
                         version = tmp[2];
                       } else {
                         request?request=request+data:request=data;
                       }
                       break;
        case this.POSTDATA: 
                       postdata?postdata=postdata+data:postdata=data;
                       break;
        }
      }  
      var replaywindow = "chrome://livehttpheaders/content/LiveHTTPReplay.xul";
      var replayoptions = "chrome,dialog=no,extrachrome,menubar,resizable,scrollbars,status,toolbar";
      window.openDialog(replaywindow, "_blank", replayoptions, 
                        this, method, url, version, request, postdata);
    }
  },
  play: function(method, url, version, request, postdata)
  {
    //DSMT: REPLAY
    //dumpall("OPENER",window.opener,2);
    var browser = window.opener.getWebNavigation();
    var mustValidate = false;
    if (browser) {
      // Change the request to an array
      var tmp = request.split(/[\r\n]/);
      var req = new Array();
      req['_METHOD_'] = method;
      for (var i in tmp) {
        //dump("Try: " + tmp[i] +"\n");
        var header = tmp[i].match(/^([^:]+)\s*:\s*(.*)$/);
        if (header) {
          //dump("Found: " + header[1] +"="+header[2]+"\n");
          if (!header[1].match(/^(Content-Length)$/)) req[header[1]]=header[2];
          if (header[1].match(/^(If-Modified-Since|If-None-Match)$/)) mustValidate=true; 
        }
      }
      // Change the post data to an InputStream
      var post = null;
      if (postdata != null) {
        const STRING_STREAM_CID = "@mozilla.org/io/string-input-stream;1";
        const nsIStringInputStream = Components.interfaces.nsIStringInputStream;
        //const SCRIPTABLE_STREAM_CID = "@mozilla.org/scriptableinputstream;1";
        //const nsIScriptableInputStream = Components.interfaces.nsIScriptableInputStream;
        const MIME_STREAM_CID = "@mozilla.org/network/mime-input-stream;1";
        const nsIMIMEInputStream = Components.interfaces.nsIMIMEInputStream;
        
        var sis = Components.classes[STRING_STREAM_CID];
        tmp = sis.createInstance(nsIStringInputStream);
        //postdata = "\r\n" + postdata; // Add header separator at begining
        tmp.setData (postdata, postdata.length);
        tmp.QueryInterface(Components.interfaces.nsISeekableStream);
        
        // Create a scriptable stream
        //var scis = Components.classes[SCRIPTABLE_STREAM_CID];
        //post = scis.createInstance(nsIScriptableInputStream);
        //post.init(tmp);

        // Create a mime stream
        var mis = Components.classes[MIME_STREAM_CID];
        post = mis.createInstance(nsIMIMEInputStream);
        post.setData(tmp);
        post.addContentLength = true;
        //if ('Content-Type' in req)
        //  post.addHeader('Content-Type', req['Content-Type']);

        //post.QueryInterface(Components.interfaces.nsIInputStream);
        //dumpall("POST",post,2);
        //dump("POST: available: " + post.available() + "\n");
        //dump("POST: data: '" + post.read(post.available()) + "'\n");
        //tmp.seek(0,0);
        //for (var i in Components.classes) {
        //  dump("Classes: " + i + "\n");
        //}
        //for (var o in Components.interfaces) {
        //  dump("Interfaces: " + o + "\n");
        //}
        //post=tmp;
      }
      this.check[url] = req;

      // And load the URL
      // Note that there may be some problems if the server answer with:304 use local copy... 
      if (mustValidate) {
        browser.loadURI(url,Components.interfaces.nsIRequest.MUST_VALIDATE,null,post,null);
      } else {
        // Must clear the url we want to replay from the cache
        var classID = Components.classes["@mozilla.org/network/cache-service;1"];
        var cacheService = classID.getService(Components.interfaces.nsICacheService);

        try {
 
          var cacheSession = cacheService.createSession('HTTP',0,true);
          //var cacheSession = cacheService.createSession('HTTP-memory-only',1,true);
          var cacheEntryDescriptor = cacheSession.openCacheEntry(url.match(/^[^#]+/) ,
                                        Components.interfaces.nsICache.ACCESS_WRITE,true);
          cacheEntryDescriptor.doom();
          cacheEntryDescriptor.close();
        } catch (ex) {
          // Not able to clear disk cache selectivly, clear all of it!
          cacheService.evictEntries(Components.interfaces.nsICache.STORE_ON_DISK);
        }

        // Must clear memory cache because the above tips doesn't work for memory...
        cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);
    
        browser.loadURI(url,0,null,post,null);
      }
    }
  },

  setTab : function(tab) {
    this.setBoolPref(this.lpref, "tab", tab);
  },
  setFilter : function(filter) {
    this.setBoolPref(this.lpref, "filter", filter);
    this.usefilter = filter;
  },
  setFilterRegexp : function(regex) {
    this.setCharPref(this.lpref, "filterRegexp", regex);
    this.filterRegexp = regex;
  },
  setExclude : function(exclude) {
    this.setBoolPref(this.lpref, "exclude", exclude);
    this.useexclude = exclude;
  },
  setExcludeRegexp : function(regex) {
    this.setCharPref(this.lpref, "excludeRegexp", regex);
    this.excludeRegexp = regex;
  },
  setStyle : function(style) {
    if (style) { style=1; } else { style=0; }
    this.setIntPref(this.lpref, "style", style);
    this.usestyle = style;
  },
  setMode : function(mode) {
    this.setIntPref(this.lpref, "mode", mode);
    this.mode = mode;
  },
  observeURL : function(name, request, response, postData)
  {
    //dumpall("REQUEST",request);
    if (this.isCapturing) {
      if (this.usefilter && !name.match(this.filterRegexp)) return;
      if (this.useexclude && name.match(this.excludeRegexp)) return;
      var oldrows = this.rowCount;
      this.addRow(name + "\r\n", this.URL);
      this.addRow("\r\n", this.REQSPACE);
      var flag = false;
      for (i in request) {
          this.addRow((flag? i+": " : "") + request[i] + "\r\n", this.REQUEST);
          flag=true;
      }
      var rawData = null;
      if (postData) {
        var data = postData.match(/^.*(\r\n|\r|\n)?/mg); // "\r\n"
        for (i in data) {
          this.addRow(data[i], this.POSTDATA);
        }
      }
      this.addRow("\r\n", this.RESSPACE);
      flag = false;
      for (i in response) {
        // Server can send some headers multiple times...
        // Try to detect this and present them in the 'good' way.
        var multi = response[i].split('\n');
        for (var o in multi) {
          this.addRow((flag ? i+": " : "") + multi[o] + "\r\n", this.RESPONSE);
        }
        flag=true;
      }
      this.addRow("", this.SEPARATOR); // Separator
      this.rowCountChanged(oldrows,(this.rows-oldrows));
    }
  },

  onModifyRequest : function (oHttp)
  {
    //dump("onModifyRequest\n");
    //dumpall("Request", oHttp,2);
    //dump("MODIFY: '" + oHttp.URI.asciiSpec +"'\n");

    //this.onExamineResponse(oHttp);
    //alert("REquest: " + oHttp)
    //this.test[oHttp.URI.asciiSpec] = 1

    if (oHttp.URI.asciiSpec in this.check) {
      //dumpall("Request", oHttp,1);
      // This observer is designed to delete all observed headers
      function emptyObserver(oHttp) {
        this.oHttp = oHttp;
        this.request = new Array();
      }
      emptyObserver.prototype = {
        visitHeader : function (name, value)
        {
          this.request[name.toLowerCase()]=value;
        },
        emptyHeaders: function ()
        {
          oHttp.visitRequestHeaders(this);
          for (var i in this.request) {
            this.oHttp.setRequestHeader(i,null,false);
          }
        }
      }
      var empty = new emptyObserver(oHttp);
      empty.emptyHeaders();

      //Get the URI and request array
      //dump("BINGO: " + uri);
      var uri = oHttp.URI.asciiSpec;
      var req = this.check[uri];
      delete this.check[uri];

      //Set the new headers
      oHttp.requestMethod = req['_METHOD_']
      delete req['_METHOD_']
      for (var i in req) {
        try {
          //dump("Try: " + i + " = " + req[i] + "\n");
          //if (i == 'Content-Type' || i == 'Content-Length') {
          //  oHttp.setRequestHeader(i, null, false);
          //} else {
          oHttp.setRequestHeader(i, req[i], false);
          //}
        } catch (ex) {
          //dump("onModifyRequest: exception: " + ex +"\n");
        }
      }
      //oHttp.requestMethod = "Get";
      //oHttp.QueryInterface(Components.interfaces.nsICachingChannel);
      //oHttp.cacheToken = null;
      //oHttp.cacheKey = null;
      //oHttp.loadFlags = oHttp.LOAD_NORMAL;
      //oHttp.loadFlags = oHttp.LOAD_BYPASS_CACHE;
      //oHttp.loadFlags = oHttp.VALIDATE_ALWAYS;
    }
    var uri = oHttp.URI.asciiSpec;
    for (observer in this.observers) {
      if ('observeGRequest' in this.observers[observer]) {
        this.observers[observer].observeGRequest(uri, oHttp.requestMethod)
      }
    }
  },

  onExamineResponse : function (oHttp)
  {
    var name = oHttp.URI.asciiSpec;
    var origname = oHttp.originalURI.asciiSpec;
    var visitor = new HeaderInfoVisitor(oHttp);
    //dumpall("oHttp",oHttp,2);
    //alert("REsponse: " + oHttp)
    //alert(this.test[oHttp])
    //if (name in this.test) {
    //    dump("URL FOUND: " + name +"\n");
    //    delete this.test[name];
    //}
    //for (i in this.test) {
    //    dump("URL: " + i + "\n");
    //}
 
    // Get the request headers
    var request = visitor.visitRequest();
    // and extract Post Data if present
    var postData = request["POSTDATA"];
    delete request["POSTDATA"];
    //DSMT
    //this.request[name]["CACHE"] = oHttp.cacheToken;
 
    // Get the response headers
    var response = visitor.visitResponse();
    //dumpall("oHttp",oHttp,5);
    //dumpall("oHttp.loadGroup",oHttp.loadGroup,2);
    //dumpall("oHttp.loadGroup.groupObserver",oHttp.loadGroup.groupObserver,2);
    //dumpall("oHttp.loadGroup.groupObserver.DOMWindow",oHttp.loadGroup.groupObserver.DOMWindow,2);
    //dumpall("oHttp.loadGroup.groupObserver.container",oHttp.loadGroup.groupObserver.container,2);
    //dumpall("oHttp.loadGroup",oHttp.loadGroup,2);
    //dumpall("oHttp.loadGroup.groupObserver",oHttp.loadGroup.groupObserver,2);
    //dumpall("oHttp.loadGroup.notificationCallbacks",oHttp.loadGroup.notificationCallbacks,2);

    var rawData = null;
    if (postData && (this.isCapturing || this.observers.length>0)) {
      this.t = postData.seekablestream;	//DSMT: REPLAY
      //this.c = request["CACHE"];
      var size, mode;
      switch (this.mode) {
        case 0: mode=0; size=0; break;	//Don't get any content
        case 1: mode=1; size=-1; break;	//Get content the fast way
        case 2: mode=2; size=-1; break;	//Get content the accurate way
        case 3: mode=2; size=1024; break;	//Only get 1024 bytes of content
      }
      postData.setMode(mode);
      rawData = postData.getPostBody(size);
    }
    this.observeURL(name, request, response, rawData);

    // Call response observers
    var isRedirect = (name != origname)
    for (observer in this.observers) {
      //dumpall("Observer", this.observers[observer], 1);
      this.observers[observer].observeResponse(name, request, response, rawData, isRedirect)
    }

    //dumpall("Request",this.request[oHttp.name],1);
    //dumpall("Response",this.response[oHttp.name],1);
  },

  QueryInterface: function(iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIHttpNotify) &&
        //!iid.equals(Components.interfaces.nsIClassInfo) &&
        //!iid.equals(Components.interfaces.nsISecurityCheckedComponent) &&
        //!iid.equals(Components.interfaces.nsIWeakReference) &&
        !iid.equals(Components.interfaces.nsIHttpNotify) &&
        !iid.equals(Components.interfaces.nsIObserver)) {
          //dump("LiveHTTPHeaders: QI unknown iid: " + iid + "\n");
          throw Components.results.NS_ERROR_NO_INTERFACE;
      }
      return this;
    }
}

function HeaderInfoVisitor (oHttp)
{
  //dump("HeaderInfoVisitor\n");
  this.oHttp = oHttp;
  this.headers = new Array();
}
HeaderInfoVisitor.prototype = 
{
  oHttp : null,
  headers : null,
  getHttpRequestVersion: function (httpProxy)
  {
    var version = "1.0"; // Default value for direct HTTP and proxy HTTP
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
  getPostData : function(oHttp) {
    function postData(stream) {
      // Scriptable Stream Constants
      const JS_SCRIPTABLEINPUTSTREAM_CID = "@mozilla.org/scriptableinputstream;1";
      const JS_SCRIPTABLEINPUTSTREAM     = "nsIScriptableInputStream";
      const JS_ScriptableInputStream = new Components.Constructor
           ( JS_SCRIPTABLEINPUTSTREAM_CID, JS_SCRIPTABLEINPUTSTREAM );
      // Create a scriptable stream
      this.seekablestream = stream;
      this.stream = new JS_ScriptableInputStream();
      this.stream.init(this.seekablestream);
      this.mode = this.FAST;

      // Check if the stream has headers
      try { 
        this.seekablestream.QueryInterface(Components.interfaces.nsIMIMEInputStream);
        this.hasheaders = true;
        this.body = -1; // Must read header to find body
      } catch (ex) {
        this.hasheaders = false;
        this.body = 0;  // Body at the start of the stream
      }
    }
    postData.prototype = {
      NONE: 0,
      FAST: 1,
      SLOW: 2,
      rewind: function() {
        this.seekablestream.seek(0,0);
      },
      tell: function() {
        return this.seekablestream.tell();
      },
      readLine: function() {
        var line = "";
        var size = 0;
        try { size = this.stream.available(); } catch (ex) { size = 0; }
        for (var i=0; i<size; i++) {
          var c = this.stream.read(1);
          if (c == '\r') {
          } else if (c == '\n') {
            break;
          } else {
            line += c;
          }
        }
        return line;
      },
      setMode: function(mode) {
        if (mode < this.NONE && mode > this.SLOW) {
          throw "postData: unsupported mode: " + this.mode;
        }
        this.mode = mode;
      },
      visitPostHeaders: function(visitor) {
        this.rewind();
        if (!this.hasheaders) { return; }
        var line = this.readLine();
        while(line) {
          if (visitor) {
            var tmp = line.split(/:\s?/);
            visitor.visitHeader(tmp[0],tmp[1]);
          }
          line = this.readLine();
        }
        body = this.tell();
      },
      getPostBody: function(max) {
        // Position the stream to the start of the body
        if (this.body < 0 || this.seekablestream.tell() != this.body) {
          this.visitPostHeaders(null);
        }

        var size = 0;
        try { size = this.stream.available(); } catch(ex) { size = 0; }
        if (max && max >= 0 && max<size) size = max;

        var postString = "";
        try {
          switch (this.mode) {
            case this.NONE:
              //Don't get any content
              break;
            case this.FAST:
              //Get the content in one shot
              if (size>0) {
                postString = this.stream.read(size);
              }
              break;
            case this.SLOW:
              //Must read octet by octet because of a bug in nsIMultiplexStream.cpp
              //This is to avoid 'NS_BASE_STREAM_CLOSED' exception that may occurs
              //See bug #188328.
              for (var i=0; i<size; i++) {
                var c=this.stream.read(1);
                c ? postString+=c : postString+='\0';
              }
              break;
          }
        } catch (ex) {
          //dump("Exception while getting POST CONTENT with mode "+this.mode+": "+ex+"\n");
          return ""+ex;
        } finally {
          // Need to close the stream after use.  
          this.seekablestream.close();
          this.stream.close();
        }
	return postString;
      }
    }
   
    // Get the postData stream from the Http Object 
    try {
      // Must change HttpChannel to UploadChannel to be able to access post data
      oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
      // Get the post data stream
      if (oHttp.uploadStream) {
        // Must change to SeekableStream to be able to rewind
        oHttp.uploadStream.QueryInterface(Components.interfaces.nsISeekableStream);
        // And return a postData object
        return new postData(oHttp.uploadStream);
      } 
    } catch (e) {
      //dump("POSTDATAEXCEPTION:"+e+"\n");
    }
  return null;
  },
  visitHeader : function (name, value)
  {
    this.headers[name] = value;
  },
  visitRequest : function ()
  {
    this.headers = new Array();
    var uri, note, ver;
    try {
      
      // Get the URL and get parts
      // Should I use  this.oHttp.URI.prePath and this.oHttp.URI.path to make
      // the URL ?  I still need to remove the '#' sign if present in 'path'
      var url = String(this.oHttp.URI.asciiSpec);

      // If an http proxy is used for this url, we need to keep the host part
      if (this.useHttpProxy(this.oHttp.URI)==true) {
        uri = url.match(/^(.*?\/\/[^\/]+\/[^#]*)/)[1];
        ver = this.getHttpRequestVersion(true);
      } else {
        uri = url.match(/^.*?\/\/[^\/]+(\/[^#]*)/)[1];
        ver = this.getHttpRequestVersion(false);
      }
    } catch (ex) {
      //dump("PPS: cas5: " + ex + "\n");
      uri = String(this.oHttp.URI.asciiSpec);
      note = "Unsure about the precedent REQUEST uri";
    }
    this.headers["REQUEST"] = this.oHttp.requestMethod + " " 
                            + uri + " HTTP/" + ver;
    if (note) this.headers["NOTE"] = note;
    this.oHttp.visitRequestHeaders(this);

    // There may be post data in the request
    var postData = this.getPostData(this.oHttp);
    if (postData) {
      postData.visitPostHeaders(this);
      this.visitHeader("POSTDATA",postData);
    } else {
      this.visitHeader("POSTDATA",null);
    }

    return this.headers;
  },
  visitResponse : function ()
  {
    this.headers = new Array();
    this.headers["RESPONSE"] = "HTTP/1.x " + this.oHttp.responseStatus 
                    + " " + this.oHttp.responseStatusText;
    //this.headers["loadGroup"] = this.oHttp.loadGroup
    //this.headers["owner"] = this.oHttp.owner
    //this.headers["notificationCallbacks"] = this.oHttp.notificationCallbacks
    //if (this.oHttp.loadGroup) this.headers["loadGroup.ncb"] = this.oHttp.loadGroup.notificationCallbacks
    this.oHttp.visitResponseHeaders(this);
    return this.headers;
  }
}
