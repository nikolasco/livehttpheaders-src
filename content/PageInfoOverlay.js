
function makeHeaderInfoTab() {
  // Important variables
  var url = theDocument.location;
  var headerinfo  = window.opener.oHeaderInfo;

  // POST
//  const JS_FILE_I_STREAM_CID             = "@mozilla.org/scriptableinputstream;1";
//  const JS_FILE_I_SCRIPTABLE_IN_STREAM   = "nsIScriptableInputStream";
//  const JS_FILE_InputStream  = new Components.Constructor
//( JS_FILE_I_STREAM_CID, JS_FILE_I_SCRIPTABLE_IN_STREAM );
//  var postis = window.opener.getPostData();
//  var postiss = postis.QueryInterface(Components.interfaces.nsISeekableStream);
//  postiss.seek(0,0);
//  var is = new JS_FILE_InputStream();
//  is.init(postiss);
//  dumpall("ISS",postiss,2);
//  dumpall("IS",is,2);
//  dump("Available:" + is.available()+"\n");
//  dump("Read:" + is.read(100)+"\n"); 
  
  
  
  // Nothing to show if about:blank !
  if (url == 'about:blank') return;

  var requestheaders = new pageInfoTreeView(["headerinfo-request-name","headerinfo-request-value"], COPYCOL_META_CONTENT);
  var responseheaders = new pageInfoTreeView(["headerinfo-response-name","headerinfo-response-value"], COPYCOL_META_CONTENT);
  var requestTree = document.getElementById("headerinfo-request-tree");
  var responseTree = document.getElementById("headerinfo-response-tree");
  
  requestTree.treeBoxObject.view = requestheaders;
  responseTree.treeBoxObject.view = responseheaders;

  var i;
  for (i in headerinfo.request[url]) {
    requestheaders.addRow([i,headerinfo.request[url][i]]);
  }
  requestheaders.rowCountChanged(0, length);

  for (i in headerinfo.response[url]) {
    responseheaders.addRow([i, headerinfo.response[url][i]]);
  }
  responseheaders.rowCountChanged(0, length);
}

