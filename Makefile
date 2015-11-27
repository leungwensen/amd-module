# grouped tasks
make:
	make install
	make compile
	make test
all:
	make preinstall
	make
	make publish

# tasks
preinstall:
	npm  install -g cnpm --registry=http://registry.npm.taobao.org
	cnpm install -g babel-cli
	cnpm install -g npm2spm
	cnpm install -g browserify
install:
	cnpm install
	npm install
compile:
	babel src --out-dir ./
	browserify define.js > dist/define.js
	browserify loader.js > dist/loader.js
test:
publish:
	npm publish
	cnpm sync amd-module
	npm2spm --publish
server:
	sh bin/server.sh

