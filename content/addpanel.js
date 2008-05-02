/*
Copyright (C) 2003 Gregoire Lejeune <gregoire.lejeune@free.fr>

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307  USA
*/

/**
Desc : Script permettant d'ajouter une fenetre dans la SideBar.
Usage: 
...
<script type="application/x-javascript" src="chrome://zoolmark/content/addpanel.js"/>
...
<script type="application/x-javascript">
addPanel("ZoolMark", "chrome://zoolmark/content/zoolmarkBrowser.xul", "Added successfully", "Already present" );
</script>
...
*/

const SIDEBAR_CID      = Components.ID("{22117140-9c6e-11d3-aaf1-00805f8a4905}");
const SIDEBAR_CONTRACTID   = "@mozilla.org/sidebar;1";
const CONTAINER_CONTRACTID = "@mozilla.org/rdf/container;1";
const DIR_SERV_CONTRACTID  = "@mozilla.org/file/directory_service;1"
const STD_URL_CONTRACTID   = "@mozilla.org/network/standard-url;1"
const NETSEARCH_CONTRACTID = "@mozilla.org/rdf/datasource;1?name=internetsearch"
const nsIRDFContainer  = Components.interfaces.nsIRDFContainer;
const nsIProperties    = Components.interfaces.nsIProperties;
const nsIFileURL       = Components.interfaces.nsIFileURL;
const nsIRDFRemoteDataSource = Components.interfaces.nsIRDFRemoteDataSource;

function addPanel(name, url, added, present) {
    var sidebar = new mySidebar();
    sidebar.addPanel(url, name, added, present);
}

function mySidebar() {
    const RDF_CONTRACTID = "@mozilla.org/rdf/rdf-service;1";
    const nsIRDFService = Components.interfaces.nsIRDFService;
    const PANELS_RDF_FILE = "UPnls"; /* directory services property to find panels.rdf */

    this.rdf = Components.classes[RDF_CONTRACTID].getService(nsIRDFService);
    this.datasource_uri = getSidebarDatasourceURI(PANELS_RDF_FILE);
    this.resource = 'urn:sidebar:current-panel-list';
    try {
        this.datasource = this.rdf.GetDataSource(this.datasource_uri);
    } catch (ex) {}
}

mySidebar.prototype.nc = "http://home.netscape.com/NC-rdf#";

/* decorate prototype to provide ``class'' methods and property accessors */
mySidebar.prototype.addPanel = function (winurl, winname, msgadded, msgpresent) {
    var aTitle = winname;
    var aContentURL = winurl;
    var aCustomizeURL = "";

    // Create a "container" wrapper around the current panels to
    // manipulate the RDF:Seq more easily.
    var panel_list = this.datasource.GetTarget(this.rdf.GetResource(this.resource), this.rdf.GetResource(mySidebar.prototype.nc+"panel-list"), true);
    panel_list.QueryInterface(Components.interfaces.nsIRDFResource);

    var container = Components.classes[CONTAINER_CONTRACTID].createInstance(nsIRDFContainer);
    container.Init(this.datasource, panel_list);

    /* Create a resource for the new panel and add it to the list */
    var panel_resource = this.rdf.GetResource("urn:sidebar:3rdparty-panel:" + aContentURL);
    var panel_index = container.IndexOf(panel_resource);
    if (panel_index != -1) { 
        // panel is already in list
        alert( aTitle + msgpresent);
        return;
    }

    /* Now make some sidebar-ish assertions about it... */
    this.datasource.Assert(panel_resource, this.rdf.GetResource(this.nc + "title"), this.rdf.GetLiteral(aTitle), true);
    this.datasource.Assert(panel_resource, this.rdf.GetResource(this.nc + "content"), this.rdf.GetLiteral(aContentURL), true);
    if (aCustomizeURL)
        this.datasource.Assert(panel_resource, this.rdf.GetResource(this.nc + "customize"), this.rdf.GetLiteral(aCustomizeURL), true);        
    container.AppendElement(panel_resource);

    // Use an assertion to pass a "refresh" event to all the sidebars.
    // They use observers to watch for this assertion (in sidebarOverlay.js).
    this.datasource.Assert(this.rdf.GetResource(this.resource), this.rdf.GetResource(this.nc + "refresh"), this.rdf.GetLiteral("true"), true);
    this.datasource.Unassert(this.rdf.GetResource(this.resource), this.rdf.GetResource(this.nc + "refresh"), this.rdf.GetLiteral("true"));

    /* Write the modified panels out. */
    this.datasource.QueryInterface(nsIRDFRemoteDataSource).Flush();
    alert( aTitle + msgadded );
}

function getSidebarDatasourceURI(panels_file_id) {
    try {
        /* use the fileLocator to look in the profile directory 
         * to find 'panels.rdf', which is the
         * database of the user's currently selected panels. */
        var directory_service = Components.classes[DIR_SERV_CONTRACTID].getService();
        if (directory_service) {
            directory_service = directory_service.QueryInterface(Components.interfaces.nsIProperties);
        }

        /* if <profile>/panels.rdf doesn't exist, get will copy
         * bin/defaults/profile/panels.rdf to <profile>/panels.rdf */
        var sidebar_file = directory_service.get(panels_file_id, Components.interfaces.nsIFile);

        var io_service = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var url = io_service.newFileURI(sidebar_file).QueryInterface(Components.interfaces.nsIFileURL);

        return url.spec;
    } catch (ex) {}
}

