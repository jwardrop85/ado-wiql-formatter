# WIQL Formatter

![CI](https://github.com/jwardrop85/ado-wiql-formatter/actions/workflows/ci.yml/badge.svg?branch=main)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg?logo=typescript)

This is a minimal VS Code extension that provides formatting for WIQL files (`.wiql`).

Install and development

1. Install dependencies:

```powershell
cd c:\repos\azdo\jwitlabs\vscode-dev\wiql-formatter
npm install
```

2. Compile:

```powershell
npm run compile
```

3. Open this folder in VS Code and press F5 to launch the Extension Development Host. Open or create a `.wiql` file and run `Format Document`.

Notes
- The current formatter is a simple proof-of-concept: it uppercases known WIQL keywords and normalizes whitespace.
- We can extend this with a full parser and formatting options.
