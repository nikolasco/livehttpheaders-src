LOCALE=locale/*/livehttpheaders
CONTENT=content
SKIN=skin

all:	clean jar xpi download

jar:
	zip livehttpheaders.jar \
        ${CONTENT}/contents.rdf \
        ${CONTENT}/headerinfo.js \
        ${CONTENT}/LiveHTTPHeaders.xul \
        ${CONTENT}/LiveHTTPHeaders.js \
        ${CONTENT}/LiveHTTPReplay.xul \
        ${CONTENT}/LiveHTTPReplay.js \
        ${CONTENT}/TasksOverlay.xul \
        ${CONTENT}/PageInfoOverlay.xul \
        ${CONTENT}/PageInfoOverlay.js \
        ${LOCALE}/contents.rdf \
        ${LOCALE}/PageInfo.dtd \
        ${LOCALE}/livehttpheaders.dtd \
        ${LOCALE}/livehttpheaders.properties \
        ${SKIN}/contents.rdf \
        ${SKIN}/livehttpheaders.css \
        ${SKIN}/favicon.ico \
        ${SKIN}/img/*

xpi:
	zip -j livehttpheaders.xpi \
	livehttpheaders.jar \
	${CONTENT}/nsHeaderInfo.js \
        ${SKIN}/LiveHTTPHeaders.ico \
        ${SKIN}/LiveHTTPHeaders.xpm \
	install.js \
	TODO.txt

download:
	cp livehttpheaders.xpi ../downloads
	cp livehttpheaders.xpi ../www

clean:
	rm livehttpheaders.xpi livehttpheaders.jar


