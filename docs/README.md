# Nexo Documentation Site

This directory contains the source code for the Nexo user documentation website, built with [Docusaurus](https://docusaurus.io/).

## 📂 Project Structure

- `docs/`: The actual documentation markdown files.
  - `user-guide/`: Getting started and installation guides.
- `src/`: React components and custom pages.
- `static/`: Static assets (images, favicon, etc.).
- `docusaurus.config.ts`: Main configuration file.

## 🚀 Development

You can run the documentation site locally to preview changes.

### From Root Directory (Recommended)

```bash
yarn docs:dev
```

### From This Directory

```bash
yarn install
yarn start
```

This starts a local development server at `http://localhost:3000`. Most changes are reflected live without having to restart the server.

## 📦 Build

To build the static website for production:

```bash
# From root
yarn docs:build

# OR from this directory
yarn build
```

The static files will be generated in the `build/` directory.

## 📝 Writing Docs

Documentation files are written in Markdown (MDX). You can add new files to `docs/` and they will automatically appear in the sidebar if you use the default sidebar configuration or add them to `sidebars.ts`.
