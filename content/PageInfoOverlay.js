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

function makeHeaderInfoTab() {
  // Important variables
  var url = theDocument.location;
  var headerinfo  = window.opener.oHeaderInfo;
  
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

