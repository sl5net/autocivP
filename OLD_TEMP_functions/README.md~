# Netlify Functions

This directory contains Netlify Functions, which are serverless functions that run on Netlify's serverless platform.

## Overview

Netlify Functions allow you to add dynamic functionality to your static website without having to manage your own servers. They are ideal for handling tasks such as:

*   Processing form submissions
*   Authenticating users
*   Connecting to third-party APIs
*   Generating dynamic content

## Contents

This directory contains the following Netlify Functions:

*   **latest-release.js:** This function retrieves information about the latest release from the GitHub repository and provides a permanent download link for the ZIP file of that latest release.

## Usage

To deploy these functions, simply add them to this directory and deploy your Netlify site. Netlify will automatically detect and deploy the functions.

## Configuration

The following environment variables are required for the `latest-release.js` function to work correctly:

*   `GITHUB_OWNER`: Your GitHub username or organization name.
*   `GITHUB_REPO`: The name of your GitHub repository.
*   `GITHUB_TOKEN`: A GitHub Personal Access Token with `repo:public_repo` (or `repo`) and `read:org` scopes.  This is used to avoid rate limiting from the GitHub API.

These environment variables must be set in the Netlify UI under Site settings -> Build & deploy -> Environment.

## Local Development

You can test these functions locally using the Netlify CLI:

1.  Install the Netlify CLI: `npm install -g netlify-cli`
2.  Navigate to the root of your repository in your terminal.
3.  Run `netlify dev` to start a local development server.
4.  Access your functions at `http://localhost:8888/.netlify/functions/<function-name>` (e.g., `http://localhost:8888/.netlify/functions/latest-release`).

## License

[Your License (e.g., MIT License)](LICENSE)  (Create a `LICENSE` file with the appropriate license text)
