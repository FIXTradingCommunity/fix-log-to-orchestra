# Build notes

## Prerequisites

### node.js and npm
Download and install node.js if necessary from [Downloads](https://nodejs.org/en/download/)

The npm package manager should be installed with node.js, but to make sure it is up-to-date, issue this command:

```
npm install npm@latest -g
```

### VS Code

VS Code is the recommended development environment (but you may use tools of your own choosing). [Download](https://code.visualstudio.com/download) and install it.

## Source code
Clone this Git repository using git clone command or a UI.

## Build

To retrieve or update dependencies, issue this command in the folder that contains package.json:

```
npm install
```

### Environment-specific builds

Each environment has a separate build procedure because of different URLs and security groups. *You cannot simply copy executables from one environment to another.* Environment variables are provided to deploy to development and production environments, and also to develop locally without user authentication.

Build with these npm scripts to produce a package suitable for deployment:

npm run-script build:dev -- for development

npm run-script build:prod  -- for production
