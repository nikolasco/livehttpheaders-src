const X_MSG = 	   "Install Live HTTP Header";
const X_NAME =     "/livehttpheaders";
const X_VER  =     "0.1";
const X_JAR_FILE = "livehttpheaders.jar";

const X_CHROME =   "chrome";
const X_CONTENT =  "content/";
const X_SKIN = 	   "skin/";
const X_LOCALE1 =  "locale/en-US/livehttpheaders/";
const X_LOCALE2 =  "locale/fr-FR/livehttpheaders/";

var err = initInstall(X_MSG, X_NAME, X_VER);
logComment("initInstall: " + err);
logComment("Installation started...");

resetError();
addFile(X_NAME, X_JAR_FILE, getFolder(X_CHROME), "");
err = getLastError();
if (err == SUCCESS || err == REBOOT_NEEDED) {
  registerChrome(DELAYED_CHROME | CONTENT, getFolder(X_CHROME, X_JAR_FILE), X_CONTENT);
  registerChrome(DELAYED_CHROME | SKIN, getFolder(X_CHROME, X_JAR_FILE), X_SKIN);
  registerChrome(DELAYED_CHROME | LOCALE, getFolder(X_CHROME, X_JAR_FILE), X_LOCALE1);
  registerChrome(DELAYED_CHROME | LOCALE, getFolder(X_CHROME, X_JAR_FILE), X_LOCALE2);
}
err = getLastError();
if (err == SUCCESS || err == REBOOT_NEEDED) {
  performInstall();
  err = getLastError();
  if (err == SUCCESS || err == REBOOT_NEEDED) {
    alert("Please restart mozilla");
  } else {
    // Nothing to do, Mozilla will display an error message himself
  }
} else {
  cancelInstall();
  if (err == -202) {
    alert("You need to have write permissions to the chrome directory:\n" + 
          getFolder(X_CHROME));
  } else if (err == -210) {
    alert("Installation cancelled by user");
  }else {
    alert("An unknown error occured.  Error code: " + err + "\n" + 
          "Look at the following URL for a description of the error code:\n" +
          "http://developer.netscape.com/docs/manuals/xpinstall/err.html");
  }
}

