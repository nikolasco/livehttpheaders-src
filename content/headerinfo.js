// Utility function, dump an object by reflexion up to niv level
function dumpall(name,obj,niv) {
  if (!niv) niv=1;
  var dumpdict=new Object();

  dump ("\n\n-------------------------------------------------------\n");
  dump ("Dump of the objet: " + name + " (" + niv + " levels)\n");
  dump ("Interfaces: ");
  for (var i in Components.interfaces) {
    try {
      obj.QueryInterface(Components.interfaces[i]);
      dump(""+Components.interfaces[i]+", ");
    } catch (ex) {}
  }
  dump("\n");
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
        this.replay = new Array();
}

HeaderInfo.prototype = 
{
  observer: null,
  observers: null,
  request: null,
  postData: null,
  response: null,
  replay: null,
  HeaderInfoVisitor: null,
 
  onExamineResponse : function (oHttp)
  {
    //dump("onExamineResponse\n");
    //dumpall("oHttp",oHttp,2);
    //dumpall("URI",oHttp.URI,2);
    //oHttp.QueryInterface(Components.interfaces.nsICachingChannel);
    //dumpall("cacheToken",oHttp.cacheToken,2);

    var name = oHttp.URI.asciiSpec;
    var visitor = new this.HeaderInfoVisitor(oHttp);

    // Get the request headers
    this.request[name] = visitor.visitRequest();
    // and extract Post Data if present
    this.postData[name] = this.request[name]["POSTDATA"];
    delete this.request[name]["POSTDATA"];
    //DSMT
    //this.request[name]["CACHE"] = oHttp.cacheToken;
    
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
    dump("MODIFY: '" + oHttp.URI.asciiSpec +"'\n");

    if (oHttp.URI.asciiSpec in this.replay) {
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
      dump("BINGO: " + uri);
      var uri = oHttp.URI.asciiSpec;
      var req = this.replay[uri];
      delete this.replay[uri];

      //Set the new headers
      for (var i in req) {
        try {
          dump("Try: " + i + " = " + req[i] + "\n");
          if (i == 'Content-Type' || i == 'Content-Length') {
            oHttp.setRequestHeader(i, null, false);
          } else {
            oHttp.setRequestHeader(i, req[i], false);
          }
        } catch (ex) {
          dump("onModifyRequest: exception: " + ex +"\n");
        }
      }
      if (!this.test) this.test = 0;
      //oHttp.setRequestHeader("X-TEST", "TEST" + this.test++, false);
      //oHttp.requestMethod = "Get";
      oHttp.loadFlags = oHttp.LOAD_NORMAL;
    }
  },

  checkrequest : function (url, request)
  {
    dump("CHECK: '" + url +"'\n");
    this.replay[url] = request;
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
                var c=this.stream.read(1);
                c ? postString+=c : postString+='\0';
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
    var uri, note, ver;
    try {
      
      // Get the URL and get parts
      // Should I use  this.oHttp.URI.prePath and this.oHttp.URI.path to make
      // the URL ?  I still need to remove the '#' sign if present in 'path'
      var url = String(this.oHttp.URI.asciiSpec);

      // If an http proxy is used for this url, we need to keep the host part
      if (this.useHttpProxy(this.oHttp.URI)==true) {
        uri = url.match(/^(.*\/\/[^\/]+\/[^#]*)/)[1];
        ver = this.getHttpRequestVersion(true);
      } else {
        uri = url.match(/^.*\/\/[^\/]+(\/[^#]*)/)[1];
        ver = this.getHttpRequestVersion(false);
      }
    } catch (ex) {
      dump("PPS: cas5: " + ex + "\n");
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
  SEPSTRING: "----------------------------------------------------------\r\n",
  
  oHeaderInfo: null,
  oDump: null,
  isCapturing: true,
  showPostData: true,
  mode: 1,

  // Tree interface
  rows: 0,
  tree: null,

  set rowCount(c) { throw "rowCount is a readonly property"; },
  get rowCount() { return this.rows; },
  setTree: function(tree) { this.tree = tree; },
  getCellText: function(row, column) {
    return this.data[row].match(/^.*/);
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
  isSeparator: function(index) { return this.type[index]==this.SEPARATOR; },
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
    var tbo = this.oDump.treeBoxObject;
    var lvr = tbo.getLastVisibleRow();
    this.tree.rowCountChanged(index, count);
    // If the last line of the tree is visible on screen, we will autoscroll
    if (lvr >= index) tbo.ensureRowIsVisible(this.rows-1);
  },

  // Select and copy function
  onselect: function()
  {
    var selection = this.oDump.view.selection;
    // Look if there is only one item selected
    if (selection.count == 1) {
      if (this.type[selection.currentIndex]==this.URL) {
        // Must do something
      }
    }
  },

  selectBlock: function()
  {
    var selection = this.oDump.view.selection;
    var index = selection.currentIndex;
    if (index>=0 && !this.isSeparator(index)) {
      var first = index;
      var last = index;
      while(first>0 && !this.isSeparator(first-1)) first--;
      while(last<this.rowCount && !this.isSeparator(last+1)) last++;
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

  // Initialisation and termination functions
  start : function()
  {
    this.oDump = document.getElementById("headerinfo-dump");
    this.oDump.treeBoxObject.view = this;
    this.oHeaderInfo.addObserver(this);
    document.getElementById("headerinfo-mode").selectedIndex=this.mode;
    dump("MODE="+this.mode+"\n");
  },

  stop : function()
  {
    this.oHeaderInfo.removeObserver(this);
    this.oDump.treeBoxObject.view = null;
    this.oDump = null;
  },

  // Header Info Lives functions
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
    this.type = new Array();
    this.rowCountChanged(0,oldrows);
  },

  saveAll: function(title)
  {
    this.saveAs(title,this.getAll());
  },
  
  saveSelection: function(title)
  {
    this.saveAs(title,this.getSelection());
  },

  saveAs: function(title,data)
  {
    title = "Salut";
    const MODE =  0x2A; // MODE_WRONLY | MODE_CREATE | MODE_TRUNCAT
    const PERM = 00644; // PERM_IRUSR | PERM_IWUSR | PERM_IRGRP | PERM_IROTH
    const PICKER_CTRID = "@mozilla.org/filepicker;1";
    const FILEOUT_CTRID = "@mozilla.org/network/file-output-stream;1";
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    const nsIFileOutputStream = Components.interfaces.nsIFileOutputStream;

    try {
      var picker = Components.classes[PICKER_CTRID].createInstance(nsIFilePicker);
      picker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
      picker.init (window, title, Components.interfaces.nsIFilePicker.modeSave);
      var rv = picker.show();

      if (rv != Components.interfaces.nsIFilePicker.returnCancel) {
        var os = Components.classes[FILEOUT_CTRID].createInstance(nsIFileOutputStream);
        os.init(picker.file, MODE, PERM, 0);
        os.write(data, data.length);
      }
    } catch (ex) {
      alert(ex);
    }
  },

  replay: function()
  {
    var method=null, url=null, version=null, request=null, postdata=null;
    
    var selection = this.oDump.view.selection;
    var index = selection.currentIndex;
    if (index>=0 && !this.isSeparator(index)) {
      var first = index;
      var data;
      while(first>0 && !this.isSeparator(first-1)) first--;
      for (var i=first; !this.isSeparator(i); i++) {
        data = this.data[i];
        dump("DATA: " + data +"\n");
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
    if (browser) {
      // Change the request in a array
      var tmp = request.split(/[\r\n]/);
      var req = new Array();
      for (var i in tmp) {
        dump("Try: " + tmp[i] +"\n");
        var header = tmp[i].match(/^([^:]+)\s*:\s*(.*)$/);
        if (header) {
          dump("Found: " + header[1] +"="+header[2]+"\n");
          req[header[1]]=header[2];
        }
      }
      // Change the post data in an InputStream
      var post = null;
      if (postdata) {
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

        //post.QueryInterface(Components.interfaces.nsIInputStream);
        //dumpall("POST",post,2);
        //dump("POST: available: " + post.available() + "\n");
        //dump("POST: data: '" + post.read(post.available()) + "'\n");
        //tmp.seek(0,0);
        for (var i in Components.classes) {
          dump("Classes: " + i + "\n");
        }
        for (var o in Components.interfaces) {
          dump("Interfaces: " + o + "\n");
        }
        //post=tmp;
      }
      this.oHeaderInfo.checkrequest(url,req);
      browser.loadURI(url,0,null,post,null);
      //browser.loadURI(url,0,null,this.t.getPostBody(),null);
    }
  },

  setMode : function(mode) {
    this.mode = mode;
  },
  observe : function(name, request, response, postData)
  {
    if (this.isCapturing) {
      var oldrows = this.rowCount;
      this.addRow(name + "\r\n", this.URL);
      this.addRow("\r\n", this.SPACE);
      var flag = false;
      for (i in request) {
          this.addRow((flag? i+": " : "") + request[i] + "\r\n", this.REQUEST);
          flag=true;
      }
      if (postData) {
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
        var data = postData.getPostBody(size).match(/^.*(\r\n|\r|\n)?/mg); // "\r\n"
        for (i in data) {
          this.addRow(data[i], this.POSTDATA);
        }
      }
      this.addRow("\r\n", this.SPACE);
      flag = false;
      for (i in response) {
        this.addRow((flag ? i+": " : "") + response[i] + "\r\n", this.RESPONSE);
        flag=true;
      }
      this.addRow("", this.SEPARATOR); // Separator
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
