.RECIPEPREFIX := >

.PHONY: install lint build dev preview

install:
> pnpm install

lint:
> pnpm lint

build:
> pnpm build

dev:
> pnpm dev

preview:
> pnpm preview
