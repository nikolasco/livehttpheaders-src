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

function makeHeaderInfoTab() {
  // Look to see if the minimum requirement is there
  if (theDocument && theDocument.defaultView) {
    if (theDocument.defaultView.headers) {
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
      requestheaders.enablehScroll("headerinfo-request-scroll","headerinfo-request-value");

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
      responseheaders.enablehScroll("headerinfo-response-scroll","headerinfo-response-value");
    } else {
      // If we are here, it must be because the nsHeaderInfo component wasn't registered
      document.getElementById("headerinfoCNR").hidden = false;
      document.getElementById("headerinfoDeck").selectedIndex = 1;
    }
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

// Add an link to a horizontal scrollbar on a TreeView class
addhScrollToTreeView(pageInfoTreeView);
function addhScrollToTreeView(tv) {
  // Hack for scrollbar.
  // Must not do this more than one time (call of original getCellText)
  if (tv && !("hScrollBar" in tv.prototype)) {
    // Initialize global scroll object
    tv.prototype.hScrollTree = new Object();
    tv.prototype.hScrollPos = 0;
    tv.prototype.hScrollBar = null;
    tv.prototype.hScrollColumn = null;
    tv.prototype.hScrollHandler = function() {
      // Need to use global oHeaderInfoLive object  this because 'this' 
      // doesn't seem to be available.
      for (var id in tv.prototype.hScrollTree) {
        var base = tv.prototype.hScrollTree[id];
        if (base && base.tree) { // Check if the tree still exists
          var curpos=base.hScrollBar.attributes.getNamedItem("curpos").value;
          if (curpos != base.hScrollPos) {
            base.hScrollPos = curpos;
            base.tree.invalidateColumn(base.hScrollColumn);
          }
        } // Should we delete the id if it doesn't exist at a time ?
      }
    }
    tv.prototype.sethScroll = function(max) {
      // Set the new maximum value and page increment to be 5 steps
      var maxpos = this.hScrollBar.attributes.getNamedItem("maxpos");
      var pageincrement = this.hScrollBar.attributes.getNamedItem("pageincrement");
      maxpos.value = (max>0 ? max-1 : 0);
      pageincrement.value = max/5;
    }
    tv.prototype.getCellTextOrig = tv.prototype.getCellText;
    tv.prototype.getCellText = function(row,column) {
      if (column == this.hScrollColumn) {
        return this.getCellTextOrig(row,column).substr(this.hScrollPos);
      } else {
        return this.getCellTextOrig(row,column);
      }
    }
    tv.prototype.enablehScroll = function(scrollbar,scrollColumn) {
      var treename = this.tree.treeBody.parentNode.id;
      this.hScrollColumn = scrollColumn;
      this.hScrollBar = document.getElementById(scrollbar);
      var max=0;
      for (var row=0; row<this.rowCount; row++) {
        var length = this.getCellTextOrig(row,scrollColumn).length;
        if (length > max) max = length;
      }
      this.sethScroll(max); // Don't know why, but if I don't call this before
                            // someone plays with the scrollbar, some 
                            // attributes of the scrollbar disapears
        
      // Keep a global reference to the treeview object
      tv.prototype.hScrollTree[scrollbar] = this;
    }

    // Start the timer to update the scroll position
    setInterval(tv.prototype.hScrollHandler,100);
  }
}

