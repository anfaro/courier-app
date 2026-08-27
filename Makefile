.PHONY: build start

build: node_modules
	npm run build
	cd cli && go build -o ../courier-cli .

node_modules: package.json
	npm install
	@touch node_modules

start:
	npm run start
