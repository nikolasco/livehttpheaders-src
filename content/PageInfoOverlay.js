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
//  **** END LICENSE BLOC ****

function makeHeaderInfoTab() {
  // Look to see if the minimum requirement is there
  if (theDocument && theDocument.defaultView && theDocument.defaultView.headers) {
    const headers = theDocument.defaultView.headers;

    //dumpall("theWindow",theWindow,2);
    //dumpall("theDocument",theDocument,2);
    //dumpall("opener",window.opener,2);

    // Get references to the trees to populate
    var requestheaders = new pageInfoTreeView(["headerinfo-request-name","headerinfo-request-value"], COPYCOL_META_CONTENT);
    var responseheaders = new pageInfoTreeView(["headerinfo-response-name","headerinfo-response-value"], COPYCOL_META_CONTENT);
    var requestTree = document.getElementById("headerinfo-request-tree");
    var responseTree = document.getElementById("headerinfo-response-tree");
  
    requestTree.treeBoxObject.view = requestheaders;
    responseTree.treeBoxObject.view = responseheaders;

    // Show source of the requests
    var source = (headers.isFromCache ? "fromcache" : "fromnetwork");
    source = document.getElementById("headerinfo-request-" + source);
    source.hidden = false;

    // Populate the trees
    var i;
    requestheaders.addRow(["REQUEST",headers.request]);
    for (i in headers.requestHeaders) {
      requestheaders.addRow([i,headers.requestHeaders[i]]);
    }
    requestheaders.rowCountChanged(0, length);

    responseheaders.addRow(["RESPONSE", headers.response]);
    for (i in headers.responseHeaders) {
      // Server can send some headers multiple times...  
      // Try to detect this and present them in the 'good' way.
      var multi = headers.responseHeaders[i].split('\n');
      for (var o in multi) {
        responseheaders.addRow([i, multi[o]]);
      }
    }
    responseheaders.rowCountChanged(0, length);
  }
}

function saveHeaderInfoTab(title) {
  
  // Look to see if the minimum requirement is there
  if (theDocument && theDocument.defaultView && theDocument.defaultView.headers) {
    const headers = theDocument.defaultView.headers;

    // First, the URL
    var txt = theDocument.location + "\n";

    // Now, the request and the request headers
    txt += "\n" + headers.request + "\n";
    for (i in headers.requestHeaders) {
      txt += i + ": " + headers.requestHeaders[i] + "\n";
    }
 
    // Finaly, the response and its headers
    txt += "\n" + headers.response + "\n";
    for (i in headers.responseHeaders) {
      // Server can send some headers multiple times...  
      // Try to detect this and present them in the 'good' way.
      var multi = headers.responseHeaders[i].split('\n');
      for (var o in multi) {
        txt += i + ": " + multi[o] + "\n";
      }
    }

    // Now save the generated headers to a file
    saveAs(txt,title);
  }
}


