// Utility function, dump an object by reflexion up to niv level
function dumpall(name,obj,niv) {
  if (!niv) niv=1;
  var dumpdict=new Object();

  dump ("\n\n-------------------------------------------------------\n");
  dump ("Dump of the objet: " + name + " (" + niv + " levels)\n");
  dump ("Address: " + obj + "\n");
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

// Utility function to save data to clipboard
function toClipboard(data) {
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
}
  
// Utility function to save data to a file
function saveAs(data, title)
{
  if (!title) title = "LiveHTTPHeaders";
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
}

