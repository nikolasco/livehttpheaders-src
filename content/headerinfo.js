// Copyright(c) 2002 Daniel Savard. 
//
// LiveHTTPHeaders: this programs have two purpose
// - Add a tab in PageInfo to show http headers sent and received 
// - Add a tool that display http headers in real time while loading pages
//
// This program is free software; you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License, or (at your option) 
// any later version.
//
// This program is distributed in the hope that it will be useful, but 
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY 
// or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for 
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 59 Temple
// Place, Suite 330, Boston, MA 02111-1307 USA

// Utility function, dump an object by reflexion up to the niv'th level
function dumpall(name,obj,niv) {
  if (!niv) niv=1;
  var dumpdict=new Object();

  dump ("\n\n-------------------------------------------------------\n");
  dump ("Dump of the objet: " + name + " (" + niv + " levels)\n");

//  var ifcs = getInterfaces(obj);
//  for (var ifc in ifcs) {
//    dump("-Interface: " + ifc + "\n");
//  }
  ifcs = null;

  _dumpall(dumpdict,obj,niv,"","");
  dump ("\n\n-------------------------------------------------------\n\n");
  
  for (i in dumpdict) {
    delete dumpdict[i];
  }
}
function _dumpall(dumpdict,obj,niv,tab,path) {

  if (obj in dumpdict) {
    dump(" (Already dumped)");
  } else {
    dumpdict[obj]=1;
    
    var i,r,str,typ;
    for (i in obj) {
      try {
        str = String(obj[i]).replace(/\n/g,"\n"+tab);
      } catch (ex) {
        str = String(ex);
      }
      try {
        typ = ""+typeof(obj[i]);
      } catch (ex) {
        typ = "unknown";
      }
      dump ("\n" + tab + i + " (" + typ + (path?", " + path:"") +"): " + str);
      if ((niv>1) && (typ=="object")) {
        _dumpall(dumpdict,obj[i],niv-1,tab+"\t",(path?path+"->"+i:i));
      }
    }
  }
}
function getInterfaces (cls)
{
    var rv = new Object();
    var e;
 
    for (var i in Components.interfaces)
    {
        try
        {
            var ifc = Components.interfaces[i];
            cls.QueryInterface(ifc);
            rv[i] = ifc;
        }
        catch (e) {}
    }
    return rv;
}

// Start of the implementation of LiveHTTPHeaders
var oHeaderInfo = null;

// Our observer of Navigation Messages
function HeaderInfo()
{
//	alert("HI-Constructor");
	this.request = new Array();
	this.response = new Array();
	this.HeaderInfoVisitor = HeaderInfoVisitor;
	this.observers = new Array();
}

HeaderInfo.prototype = 
{
  observer: null,
  observers: null,
  request: null,
  response: null,
  HeaderInfoVisitor: null,

  onExamineResponse : function (oHttp)
  {
    //dump("onExamineResponse\n");

    var name = oHttp.URI.asciiSpec;
    var visitor = new this.HeaderInfoVisitor(oHttp);
    this.request[name] = visitor.visitRequest();
    this.response[name] = visitor.visitResponse();

    for (var o in this.observers) {
      //dump("There is an observer...\n");
      try {
        //dump("Calling Observer: " + o + "\n");
        if (this.observers[o]) {
          this.observers[o].observe(name, this.request[name], 
                                          this.response[name]);
        }
      } catch (ex) {
        //dump("Deleting Observer: " + o + "\n");
        delete this.observers[o];
	this.observers = new Array();
      }
    }
    //dumpall("Request",this.request[oHttp.name],1);
    //dumpall("Response",this.response[oHttp.name],1);
  },

  onModifyRequest : function (oHttp)
  {
    //dump("onModifyRequest\n");
    //dumpall("Request", oHttp,1);
  },
 
  addObserver : function (observer)
  {
    this.observers[observer] = observer;
  },

  removeObserver : function (observer)
  {
    delete this.observers[observer];
  },

  QueryInterface : function (iid) 
  {
    //alert("HI-QueryInterface");
    if(!iid.equals(Components.interfaces.nsISupports) &&
       !iid.equals(Components.interfaces.nsIHttpNotify)) {
      dump("HeaderInfo: QueryInterface: " + iid + "\n");
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
  useHttpProxy : function (uri)
  {
    try {
      var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService().QueryInterface(Components.interfaces.nsIProtocolProxyService);
      
      // If a proxy is used for this url, we need to keep the host part
      if (pps.proxyEnabled && (pps.examineForProxy(uri)!=null)) {
        // Proxies are enabled.  Now, check if it is an HTTP proxy.
        return true;
      } else {
        return false;
      }
    } catch (ex) {
      return null;
    }
  },
  visitHeader : function (name, value)
  {
    this.headers[name] = value;
  },
  visitRequest : function (visitFunc)
  {
    this.headers = new Array();
    var uri, note;
    try {
      
      // Get the URL and get parts
      // Should I use  this.oHttp.URI.prePath and this.oHttp.URI.path to make
      // the URL ?  I still need to remove the '#' sign if present in 'path'
      var url = String(this.oHttp.URI.asciiSpec);

      // If an http proxy is used for this url, we need to keep the host part
      if (this.useHttpProxy(this.oHttp.URI)==true) {
        uri = url.match(/^(.*\/\/[^\/]+\/[^#]*)/)[1];
      } else {
        uri = url.match(/^.*\/\/[^\/]+(\/[^#]*)/)[1];
      }
    } catch (ex) {
      dump("PPS: cas5: " + ex + "\n");
      uri = String(this.oHttp.URI.asciiSpec);
      note = "Unsure about the precedent REQUEST uri";
    }
    this.headers["REQUEST"] = this.oHttp.requestMethod + " " 
                            + uri + " HTTP/1.x";
    if (note) this.headers["NOTE"] = note;
    this.oHttp.visitRequestHeaders(this);
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

function Init()
{
  //alert("HI-Init");

  // Install our navigation observer so we can track the main client window.
  // Only if the window as a content...
  if (window._content) {
    oHeaderInfo = new HeaderInfo();
    //dumpall("HeaderInfo",oHeaderInfo);

    // Register a new response listener
    var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
    netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/request;1", oHeaderInfo);
    netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/response;1", oHeaderInfo);
  }
}

function Destruct()
{
  // Remove listener only if needed
  if (oHeaderInfo) {
    // UnRegister the response listener
    var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
    netModuleMgr.unregisterModule("@mozilla.org/network/moduleMgr/http/request;1", oHeaderInfo);
    netModuleMgr.unregisterModule("@mozilla.org/network/moduleMgr/http/response;1", oHeaderInfo);
  }
}

var oHeaderInfoLive;
function startHeaderInfoLive() {
  oHeaderInfoLive = new HeaderInfoLive(window.opener.oHeaderInfo);
  oHeaderInfoLive.start();
}
function stopHeaderInfoLive() {
  oHeaderInfoLive.stop();
  delete oHeaderInfoLive;
  oHeaderInfoLive = null;
}
function HeaderInfoLive(oHeaderInfo)
{
  this.oHeaderInfo = oHeaderInfo;
  this.data = new Array();
}
HeaderInfoLive.prototype =
{
  oHeaderInfo: null,
  oDump: null,
  isCapturing: true,

  // Tree interface
  rows: 0,
  tree: null,
  data: null,

  set rowCount(c) { throw "rowCount is a readonly property"; },
  get rowCount() { return this.rows; },
  setTree: function(tree) { this.tree = tree; },
  getCellText: function(row, column) { return this.data[row]; },
  setCellText: function(row, column, text) { },
  getRowProperties: function(row, column, prop) { },
  getCellProperties: function(row, prop) { },
  getColumnProperties: function(column, elem, prop) { },
  isContainer: function(index) { return false; },
  isContainerOpen: function(index) { return false; },
  isSeparator: function(index) { return this.data[index]==null; },
  isSorted: function() { },
  canDropOn: function(index) { return false; },
  canDropBeforeAfter: function(index, before) { return false; },
  drop: function(row, orientation) { return false; },
  getParentIndex: function(index) { return 0; },
  hasNextSibling: function(index, after) { return false; },
  getLevel: function(index) { return 0; },
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
  addRow: function(row) { this.rows = this.data.push(row); }, //A
  rowCountChanged: function(index, count) //A
  {
    this.tree.rowCountChanged(index, count);
  },

  // Header Info Lives functions
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
    const sep = "----------------------------------------------------------\n";
    var selection = this.oDump.view.selection;
    var data = "", rStart = {}, rEnd = {};
    var ranges = selection.getRangeCount();
    for (var range=0; range<ranges; range++) {
      selection.getRangeAt(range, rStart, rEnd);
      if (rStart.value >=0 && rEnd.value >=0) {
        for (var row=rStart.value; row<=rEnd.value; row++) {
	  if (this.data[row]==null) {
	    data += sep; // This is a separator
	  } else {
            data += this.data[row]+"\n";
	  }
	}
      }
    }
    this.toClipboard(data);
  },

  start : function()
  {
    this.oDump = document.getElementById("headerinfo-dump");
    this.oDump.treeBoxObject.view = this;
    this.oHeaderInfo.addObserver(this);
  },

  stop : function()
  {
    this.oHeaderInfo.removeObserver(this);
    this.oDump.treeBoxObject.view = null;
    this.oDump = null;
  },

  capture : function(flag)
  {
    this.isCapturing = flag;
  },

  clear : function()
  {
    //this.oDump.value = "";
    var oldrows = this.rows;
    this.rows = 0;
    this.data = new Array();
    this.rowCountChanged(0,oldrows);
  },

  observe : function(name, request, response)
  {
    if (this.isCapturing) {
      var oldrows = this.rows;
      this.addRow(name);
      this.addRow("");
      var flag = false;
      for (i in request) {
          this.addRow((flag? i+": " : "") + request[i]);
          flag=true;
      }
      this.addRow("");
      flag = false;
      for (i in response) {
        this.addRow((flag ? i+": " : "") + response[i]);
        flag=true;
      }
      //this.addRow("");
      this.addRow(null); // Separator
      //this.addRow("");
      this.rowCountChanged(oldrows,this.rows);
    }
  }
}

// Register only if this is a content window
addEventListener("load", Init, false);
addEventListener("unload", Destruct, false);

