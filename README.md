# Part Finder

When you are working on an XP-part you want to know where on your site it's being used, so that you can test it or
update the configuration.

This application gives insight into which content uses which of your components.

![Part finder icon](./src/main/resources/application.svg)

## Setup

Install npm-dependencies

```bash
npm install
```

To prepare the Storybook-environment you need to create a _.env_ file. The easiest way is to copy over the existing
_.env_example_ file.

```bash
cp .env_example .env
```

> [!IMPORTANT]
> Make sure `STORYBOOK_SERVER_URL` in _.env_ matches a valid service path in **your** local XP setup.

## Running storybook

To make development easier and quicker, pages, layouts, parts and Freemarker-macros have Storybook-stories that let us
get immediate feedback when developing.

To be able to run Storybook locally you need to install [xp-storybook](https://github.com/ItemConsulting/xp-storybook)
in your local sandbox. When it is installed, you can run storybook locally with the following command:

```bash
npm run storybook
```

## Building

To build the project, run the following command

```bash
enonic project build
```

You will find the jar-file at _./build/libs/item.jar_

## Deploying locally

To deploy to a local sandbox, run the following command

```bash
enonic project deploy
```

## Deploy to Jitpack

Go to the [Jitpack page for xp-part-finder](https://jitpack.io/#no.item/xp-part-finder) to deploy from Github.
