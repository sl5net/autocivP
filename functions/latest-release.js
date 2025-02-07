exports.handler = async (event, context) => {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  try {
    const owner = process.env.sl5net;
    const repo = process.env.autocivp;

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
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
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

    // Find the ZIP asset in the release
    let zipAssetUrl = null;
    if (data.assets && data.assets.length > 0) {
      for (const asset of data.assets) {
        if (asset.name.endsWith(".zip")) {
          zipAssetUrl = asset.browser_download_url;
          break; // Stop searching after finding the first ZIP
        }
      }
    }

    if (!zipAssetUrl) {
      console.error("No ZIP asset found in the latest release.");
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No ZIP asset found in the latest release." }),
      };
    }

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
        downloadUrl: zipAssetUrl, // Use the correct download URL from the asset
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
