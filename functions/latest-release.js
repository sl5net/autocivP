const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    const owner = process.env.sl5net; // Your GitHub username or organization
    const repo = process.env.autocivp;   // Your GitHub repository name

    if (!owner || !repo) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
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
      let errorMessage = `GitHub API error: ${response.status} - ${response.statusText}`;

      if (response.status === 403) {
        errorMessage = "GitHub API rate limit exceeded. Please try again later.";
      }

      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: errorMessage }),
      };
    }

    const data = await response.json();

    // Get the tag name from the latest release
    const tagName = data.tag_name;

    // Construct the download URL for the ZIP file
    const downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/tags/${tagName}.zip`;


    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        tagName: data.tag_name,
        name: data.name,
        htmlUrl: data.html_url,
        publishedAt: data.published_at,
        downloadUrl: downloadUrl, // Add the download URL to the response!
      }),
    };

  } catch (error) {
    console.error("Error fetching latest release:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
