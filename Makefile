LOCALE=locale/*/livehttpheaders
CONTENT=content
SKIN=skin

all:	clean jar xpi download

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
        ${LOCALE}/contents.rdf \
        ${LOCALE}/PageInfo.dtd \
        ${LOCALE}/livehttpheaders.dtd \
        ${LOCALE}/livehttpheaders.properties \
        ${LOCALE}/registerComponent.html \
        ${LOCALE}/generator.dtd \
        ${LOCALE}/generator-help.xul \
        ${SKIN}/contents.rdf \
        ${SKIN}/livehttpheaders.css \
        ${SKIN}/LiveHTTPHeaders.jpg \
        ${SKIN}/favicon.ico \
        ${SKIN}/img/*

xpi:
	cp install.js tmp
	cp install.rdf tmp
	cp ${CONTENT}/nsHeaderInfo.js tmp/components
	cp ${SKIN}/LiveHTTPHeaders.ico tmp/defaults
	cp ${SKIN}/LiveHTTPHeaders.xpm tmp/defaults
	cp TODO.txt tmp
	cd tmp ; zip -r livehttpheaders.xpi *

xpi2:
	cp install.js install.rdf tmp
	cp ${CONTENT}/nsHeaderInfo.js tmp/components
	cd tmp
	zip -j livehttpheaders.xpi tmp
	livehttpheaders.jar \
	${CONTENT}/nsHeaderInfo.js \
        ${SKIN}/LiveHTTPHeaders.ico \
        ${SKIN}/LiveHTTPHeaders.xpm \
	install.js \
	TODO.txt

download:
	cp tmp/livehttpheaders.xpi ../downloads
	cp tmp/livehttpheaders.xpi ../www

clean:
	rm -fr tmp
	mkdir -p tmp tmp/chrome tmp/components tmp/defaults/preferences


