const X_MSG = 	   "Install Live HTTP Header";
const X_NAME =     "/livehttpheaders";
const X_NAME_COM = "/livehttpheaders_com";
const X_VER  =     "0.8";
const X_JAR_FILE = "livehttpheaders.jar";
const X_COM_FILE = "nsHeaderInfo.js";

var chromeFolder = getFolder("Profile", "chrome");
var componentDir = getFolder("Profile", "components");
var iconFolder = getFolder(getFolder("Profile", "icons"), "default");
const X_CONTENT =  "content/";
const X_SKIN = 	   "skin/";
const X_LOCALE1 =  "locale/en-US/livehttpheaders/";
const X_LOCALE2 =  "locale/fr-FR/livehttpheaders/";

var err = initInstall(X_MSG, X_NAME, X_VER);
logComment("initInstall: " + err);
logComment("Installation started...");

resetError();
addFile(X_NAME, X_JAR_FILE, chromeFolder, "");
err = getLastError();
if (err == SUCCESS || err == REBOOT_NEEDED) {
  addFile(X_NAME_COM, X_COM_FILE, componentDir, "");
}
if (err == SUCCESS || err == REBOOT_NEEDED) {
  addFile(X_NAME, "LiveHTTPHeaders.xpm", iconFolder, "");
  addFile(X_NAME, "LiveHTTPHeaders.ico", iconFolder, "");
}
if (err == SUCCESS || err == REBOOT_NEEDED) {
  registerChrome(PROFILE_CHROME | CONTENT, getFolder(chromeFolder, X_JAR_FILE), X_CONTENT);
  registerChrome(PROFILE_CHROME | SKIN, getFolder(chromeFolder, X_JAR_FILE), X_SKIN);
  registerChrome(PROFILE_CHROME | LOCALE, getFolder(chromeFolder, X_JAR_FILE), X_LOCALE1);
  registerChrome(PROFILE_CHROME | LOCALE, getFolder(chromeFolder, X_JAR_FILE), X_LOCALE2);
}
err = getLastError();
if (err == SUCCESS || err == REBOOT_NEEDED) {
  performInstall();
  err = getLastError();
  if (err == SUCCESS || err == REBOOT_NEEDED) {
    alert("LiveHTTPHeaders version " + X_VER + " is now installed.\n\nPlease restart mozilla.");
  } else {
    // Nothing to do, Mozilla will display an error message himself
  }
} else {
  cancelInstall();
  if (err == -202) {
    alert("You need to have write permissions to the chrome directory and subfolders:\n" + 
          chromeFolder + " and to the components directory:\n" +
          componentDir);
  } else if (err == -210) {
    alert("Installation cancelled by user");
  }else {
    alert("An unknown error occured.  Error code: " + err + "\n" + 
          "Look at the following URL for a description of the error code:\n" +
          "http://developer.netscape.com/docs/manuals/xpinstall/err.html");
  }
}

