LOCALE=locale/*/livehttpheaders
CONTENT=content
ICONS=icons
SKIN=skin

all:	clean jar xpi download root

jar:
	zip tmp/chrome/livehttpheaders.jar \
        ${CONTENT}/contents.rdf \
        ${CONTENT}/headerinfo.js \
        ${CONTENT}/LiveHTTPHeaders.xul \
        ${CONTENT}/LiveHTTPHeaders.js \
        ${CONTENT}/LiveHTTPReplay.xul \
        ${CONTENT}/LiveHTTPReplay.js \
        ${CONTENT}/TasksOverlay.xul \
        ${CONTENT}/PageInfoOverlay.xul \
        ${CONTENT}/PageInfoOverlay.js \
        ${CONTENT}/LiveHTTPSideBar.xul \
        ${CONTENT}/addpanel.js \
        ${CONTENT}/Generator.js \
        ${CONTENT}/Generator.xul \
		${CONTENT}/overlay.js \
        ${LOCALE}/contents.rdf \
        ${LOCALE}/PageInfo.dtd \
        ${LOCALE}/livehttpheaders.dtd \
        ${LOCALE}/livehttpheaders.properties \
        ${LOCALE}/registerComponent.html \
        ${LOCALE}/generator.dtd \
        ${LOCALE}/generator-help.xul \
        ${SKIN}/contents.rdf \
        ${SKIN}/livehttpheaders.css \
        ${SKIN}/img/Logo_32.png \
        ${SKIN}/img/Logo_24.png \
        ${SKIN}/img/Logo_16.png \
        ${SKIN}/favicon.ico \
        ${SKIN}/img/*

xpi:
	cp install.rdf install.js tmp
	cp chrome.manifest tmp
	cp ${CONTENT}/nsHeaderInfo.js tmp/components
	cp prefs.js tmp/defaults/preferences/
	mkdir -p tmp/chrome/icons/default
	cp ${ICONS}/default/LiveHTTPHeaders.ico tmp/chrome/icons/default
	cp ${ICONS}/default/LiveHTTPHeaders.xpm tmp/chrome/icons/default
	cp TODO.txt tmp
	cd tmp ; zip -r livehttpheaders.xpi *

xpi2:
	cp install.rdf install.js tmp
	cp ${CONTENT}/nsHeaderInfo.js tmp/components
	cd tmp
	zip -j livehttpheaders.xpi tmp
	livehttpheaders.jar \
	${CONTENT}/nsHeaderInfo.js \
        ${SKIN}/LiveHTTPHeaders.ico \
        ${SKIN}/LiveHTTPHeaders.xpm \
	TODO.txt

download:
	cp tmp/livehttpheaders.xpi ../downloads
	cp tmp/livehttpheaders.xpi ../www

clean:
	rm -fr tmp
	mkdir -p tmp tmp/chrome tmp/components tmp/defaults/preferences

root:
	cp tmp/chrome/livehttpheaders.jar /root/.mozilla/firefox/s6oo8y1y.default/extensions/{8f8fe09b-0bd3-4470-bc1b-8cad42b8203a}/chrome/
	cp tmp/components/nsHeaderInfo.js /root/.mozilla/firefox/s6oo8y1y.default/extensions/{8f8fe09b-0bd3-4470-bc1b-8cad42b8203a}/components/
	cp tmp/chrome/livehttpheaders.jar /usr/lib/mozilla/chrome/
	cp tmp/components/nsHeaderInfo.js /usr/lib/mozilla/components/

