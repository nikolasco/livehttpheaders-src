// Utility function, dump an object by reflexion up to niv level
function dumpall(name,obj,niv) {
  if (!niv) niv=1;
  var dumpdict=new Object();

  dump ("\n\n-------------------------------------------------------\n");
  dump ("Dump of the objet: " + name + " (" + niv + " levels)\n");
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

var oHeaderInfo = null;

// Our observer of Navigation Messages
function HeaderInfo()
{
//	alert("HI-Constructor");
	this.request = new Array();
	this.response = new Array();
        this.postData = new Array();
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

    // Get the request headers
    this.request[name] = visitor.visitRequest();
    // and extract Post Data if present
    this.postData[name] = this.request[name]["POSTDATA"];
    delete this.request[name]["POSTDATA"];
    
    // Get the response headers
    this.response[name] = visitor.visitResponse();
    //dumpall("oHttp",oHttp,5);

    // If there is registered observers, tell them we have headers
    for (var o in this.observers) {
      //dump("There is an observer...\n");
      try {
        //dump("Calling Observer: " + o + "\n");
        if (this.observers[o]) {
          this.observers[o].observe(name, this.request[name], 
                                          this.response[name],
                                          this.postData[name]);
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
      this.body = -1;
      this.mode = this.FAST;
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
        var size = this.stream.available();
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

        var size = this.stream.available();
        if (max && max >= 0 && max<size) size = max;

        var postString = "";
        try {
          switch (this.mode) {
            case this.NONE:
              //Don't get any content
              break;
            case this.FAST:
              //Get the content in one shot
              postString = this.stream.read(size);
              break;
            case this.SLOW:
              //Must read octet by octet because of a bug in nsIMultiplexStream.cpp
              //This is to avoid 'NS_BASE_STREAM_CLOSED' exception that may occurs
              //See bug #188328.
              for (var i=0; i<size; i++) {
                postString += this.stream.read(1);
              }
              break;
          }
        } catch (ex) {
          dump("Exception while getting POST CONTENT with mode "+this.mode+": "+ex+"\n");
          return ""+ex;
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
      dump("POSTDATAEXCEPTION:"+e+"\n");
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
  this.data = new Array(); //Data for each row
  this.type = new Array(); //Type of data (request, post, response, url, etc)
}
HeaderInfoLive.prototype =
{
  // Constants
  URL : 1,
  REQUEST : 2,
  POSTDATA : 3,
  RESPONSE : 4,
  SPACE : 5,
  SEPARATOR : 6,
  
  oHeaderInfo: null,
  oDump: null,
  isCapturing: true,
  showPostData: true,
  mode: 1,

  // Tree interface
  rows: 0,
  tree: null,
  data: null,

  set rowCount(c) { throw "rowCount is a readonly property"; },
  get rowCount() { return this.rows; },
  setTree: function(tree) { this.tree = tree; },
  getCellText: function(row, column) {
    return this.data[row]; 
  },
  setCellText: function(row, column, text) { },
  getRowProperties: function(row, props) { },
  getCellProperties: function(row, col, props) {
//    if (this.type[row] == this.POSTDATA) {
//      var aserv=Components.classes["@mozilla.org/atom-service;1"].
//                createInstance(Components.interfaces.nsIAtomService);
//      props.AppendElement(aserv.getAtom("postData"));
//    }
  },
  getColumnProperties: function(column, elem, prop) { },
  isContainer: function(index) { return false; },
  isContainerOpen: function(index) { return this.showPostData; },
  isContainerEmpty: function(index) { return false; },
  isSeparator: function(index) { return this.type[index] == this.SEPARATOR; },
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
    this.type.push(type);
    this.rows = this.data.push(row); 
  }, //A
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
    document.getElementById("headerinfo-mode").selectedIndex = this.mode;
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

  setMode : function(mode) {
    this.mode = mode;
  },
  observe : function(name, request, response, postData)
  {
    if (this.isCapturing) {
      var oldrows = this.rows;
      this.addRow(name, this.URL);
      this.addRow("", this.SPACE);
      var flag = false;
      for (i in request) {
          this.addRow((flag? i+": " : "") + request[i], this.REQUEST);
          flag=true;
      }
      if (postData) {
        var size, mode;
        switch (this.mode) {
          case 0: mode=0; size=0; break;	//Don't get any content
          case 1: mode=1; size=-1; break;	//Get content the fast way
          case 2: mode=2; size=-1; break;	//Get content the accurate way
          case 3: mode=2; size=1024; break;	//Only get 1024 bytes of content
        }
        postData.setMode(mode);
        var data = postData.getPostBody(size).split("\r\n");
        for (i in data) {
          this.addRow(data[i], this.POSTDATA);
        }
      }
      this.addRow("", this.SPACE);
      flag = false;
      for (i in response) {
        this.addRow((flag ? i+": " : "") + response[i], this.RESPONSE);
        flag=true;
      }
      this.addRow(null, this.SEPARATOR); // Separator
      this.rowCountChanged(oldrows,this.rows);
    }
  }
}

// Register only if this is a content window
addEventListener("load", Init, false);
addEventListener("unload", Destruct, false);
//dumpall("Window",window,5);
//dumpall("WebNavigation",window.getWebNavigation(),5);
//dumpall("Browser",window.getBrowser(),5);

