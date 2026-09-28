.PHONY: install prepare dev test check format lint fix check-all

install:
	npm install

prepare: install

dev:
	npm run dev

test:
	npm test

check:
	npm run check

format:
	npm run format

lint:
	npm run lint

fix:
	npx biome check --write .

check-all: check test
