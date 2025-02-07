// functions/latest-release.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    const owner = process.env.GITHUB_OWNER; // Your GitHub username or organization
    const repo = process.env.GITHUB_REPO;   // Your GitHub repository name

    if (!owner || !repo) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GITHUB_OWNER and GITHUB_REPO environment variables must be defined." }),
      };
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`, // Optional, but recommended for rate limiting
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} - ${response.statusText}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `GitHub API error: ${response.status} - ${response.statusText}` }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        tagName: data.tag_name,
        name: data.name,
        htmlUrl: data.html_url,
        publishedAt: data.published_at,
        // You can include other relevant fields from the release data here
      }),
    };

  } catch (error) {
    console.error("Error fetching latest release:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
