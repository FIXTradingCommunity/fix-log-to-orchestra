# Build notes

## Prerequisites

### node.js and npm
Download and nstall node.js from [Downloads](https://nodejs.org/en/download/)

The npm package manager should be installed with node.js, but to make sure it is up-to-date, issue this command:

```
npm install npm@latest -g
```

### VS Code

VS Code is the recommended development environment (but you may use tools of your own choosing). [Download](https://code.visualstudio.com/download) and install it.

## Source code
Clone this Bitbucket repository using git clone command or a UI.

## Build

To retrieve or update dependencies, issue this command in the folder that contains package.json:

```
npm install
```

Build with this command to produce a package suitable for deployment:

```
npm run-script build
```
