//  **** BEGIN LICENSE BLOCK ****
//  Copyright(c) 2004 ABAS Software AG (Stefan Trcek)
//  Based on LiveHTTPHeaders.js Copyright(c) 2002-2003 Daniel Savard.
//
//  Generator:
//    This program can write test plan fragments suitable for load testing
//    or unit testing.
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

var oGenerator;
function startGenerator() {
  oGenerator = MakeGenerator();
  oGenerator.start();
  //dump_obj("oGenerator=", oGenerator);
  addToListener(oGenerator);
  //dump("END startGenerator\n");
}
function stopGenerator() {
  removeFromListener(oGenerator);
  oGenerator.stop();
  delete oGenerator;
  oGenerator = null;
}


function MakeGenerator() {
  var gen = new HeaderInfoLive();
  gen.datapresent = "gen-datapresent",
  gen.isCapturing    = false;

  gen.isWebrobot     = true;
  gen.show_images    = true;
  gen.show_css       = true;
  gen.show_redirects = false;
  gen.show_requests  = false;
  gen.show_invalid   = false;
  gen.show_skipped   = false;
  gen.setWebrobot    = function(state) { this.isWebrobot = state; }
  gen.showImages     = function(state) { this.show_images = state; };
  gen.showCSS        = function(state) { this.show_css = state; };
  gen.showRequest    = function(state) { this.show_requests = state; };
  gen.showRedirects  = function(state) { this.show_redirects = state; };
  gen.showInvalid    = function(state) { this.show_invalid = state; };
  gen.showSkipped    = function(state) { this.show_skipped = state; };

  gen.generateURL = function(name, request, response, postData, isRedirect) {
    //dump("generateURL name="+name+" request="+request+" isRedirect="+isRedirect+"\n");
    if (this.isWebrobot) {
      //noheaders();
      var oldrows = this.rowCount;

      // request
      var reqArray = request["REQUEST"].split(" ");
      var method = reqArray[0];
      var url    = reqArray[1];
      
      // response
      var resArray = response["RESPONSE"].split(" ");
      var errCode = resArray[1];

      var out = method + " " + url;
      //this.addRow(request["REQUEST"] + "\r\n", this.REQUEST);
      //for (i in request) {
      //  this.addRow(i + "=" + request[i] + "\r\n", this.REQUEST);
      //}
      if (postData) {
        var size = -1;
        var mode = 2;
        postData.setMode(mode);
        var data = postData.getPostBody(size).match(/^.*(\r\n|\r|\n)?/mg); // "\r\n"
        for (i in data) {
          out += " " + data[i];
        }
      }
      
      var ct = response["Content-Type"] || "";
      var skip = "";
      if (isRedirect) {
        skip = "redirect";
      }
      else if (! errCode.match(/[23]../)) {
        skip = "invalid";
      }
      else if (ct.match(/image\//)) {
        skip = "image";
      }
      else if (ct == "text/css") {
        skip = "css";
      }

      if (this.show_redirect && skip == "redirect" ||
          this.show_invalid && skip == "invalid" ||
          this.show_images && skip == "image" ||
          this.show_css && skip == "css" ||
          skip == ""
               ) {
        this.addRow(out + "\r\n", this.REQUEST);
      }
      else if (this.show_skipped && skip != "") {
        this.addRow("#" + skip + "# " + out + "\r\n", this.REQUEST);
      }

      this.rowCountChanged(oldrows,(this.rows-oldrows));
    }
  };

//    // This is the observerService's observe listener.
//    gen.observe = function(aSubject, aTopic, aData) {
//      //dump("*** oGenerator: observe aSubject=" + aSubject + " aTopic=" + aTopic + " aData=" + aData + "\n");
//      if (aTopic == 'http-on-modify-request') {
//        aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
//        this.onModifyRequest(aSubject);
//      } else if (aTopic == 'http-on-examine-response') {
//        aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
//        this.onExamineResponse(aSubject);
//      }
//    };

//  gen.onModifyRequest0 = this.onModifyRequest;
  gen.onModifyRequest = function (oHttp)
  {
    if (this.isWebrobot && this.show_requests) {
      var oldrows = this.rowCount;
      this.addRow("#request# " + oHttp.requestMethod + " " +
                  oHttp.URI.asciiSpec + "\r\n", this.REQUEST);
      this.rowCountChanged(oldrows,(this.rows-oldrows));
    }
//    this.onModifyRequest0(oHttp);
  };

//  gen.onModifyResponse0 = this.onModifyResponse;
  gen.onExamineResponse = function (oHttp)
  {
    //dump("onExamineResponse" + oHttp + "\n");
    var name = oHttp.URI.asciiSpec;
    var visitor = new HeaderInfoVisitor(oHttp);
    
    // Get the request headers
    var request = visitor.visitRequest();
    // and extract Post Data if present
    var postData = request["POSTDATA"];
    delete request["POSTDATA"];
 
    // Get the response headers
    var response = visitor.visitResponse();

    this.generateURL(name, request, response, postData,
                    oHttp.URI.asciiSpec != oHttp.originalURI.asciiSpec);

    //dumpall("Request",this.request[oHttp.name],1);
    //dumpall("Response",this.response[oHttp.name],1);
  };

  // Initialisation and termination functions
  gen.start = function()
  {
    this.oDump = document.getElementById("generator-dump");
    this.oDump.treeBoxObject.view = this;
 
    // Set scrollbar
    this.hScrollBar = document.getElementById("generator-dump-scroll");
    setInterval(this.hScrollHandler,100);

    this.initAtoms();
  };

  gen.hScrollHandler = function() {
    // Need to use global oGenerator object because 'this'
    // doesn't seem to be available.
    var base = oGenerator;
    var curpos = base.hScrollBar.attributes.getNamedItem("curpos").value;
    if (curpos != base.hScrollPos) {
      base.hScrollPos = curpos;
      base.tree.invalidate();
    }
  };

  return gen;
}


function dump_obj(prefix, obj) {
  try {
    if (obj) {
      for (i in obj) {
        try {
          if (! obj[i]) {
            dump(prefix + "[UNDEF] " + i + "\n");
          }
          else if (typeof(obj[i]) == "function") {
            dump(prefix + "[" + typeof(obj[i]) + "] " + i + "\n");
          }
          else if (typeof(obj[i]) == "object") {
            dump(prefix + "[" + typeof(obj[i]) + "] " + i + " = " + obj[i] + "\n");
          }
          else {
            dump(prefix + "[" + typeof(obj[i]) + "] " + i + " = " + obj[i] + "\n");
          }
        }
        catch (exc) {
          alert("ERROR on " + i + ": " + exc);
        }
      }
    }
    else {
      dump(prefix + "OBJECT IS UNDEFINED\n");
    }
  }
  catch (exc2) {
      dump(prefix + "ANY ERROR\n");
  }
}


