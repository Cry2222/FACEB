# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository hosts a single static HTML privacy policy page (`index.html`) for a Facebook Graph API integration app that manages and publishes content on authorized Facebook Pages. There is no build system, framework, backend, or tooling of any kind.

## Structure

- `index.html` — The only tracked file. A self-contained privacy policy page with inline CSS. No external dependencies, scripts, or assets.

## Development

No build, install, or start commands are needed. Open `index.html` directly in a browser to preview it.

There are no tests, linters, or CI pipelines configured in this repository.

## Key Conventions

- All styling is inline in the `<body>` tag. Keep it that way to maintain zero external dependencies.
- The contact email referenced for data deletion requests is `onesetforu@gmail.com`.
- The "Last updated" date near the top of `index.html` should be updated whenever the policy content changes.
