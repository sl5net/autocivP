import { Handler, Context } from '@netlify/functions';
import fetch, { Response } from 'node-fetch';

// Define the structure of the GitHub release object (adjust as needed)
interface GitHubRelease {
  tag_name: string;
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

const handler: Handler = async (event: any, context: Context) => {
  try {
    // Ensure environment variables are strings
    const owner: string = process.env.GITHUB_OWNER || "sl5net";
    const repo: string = process.env.AUTOCIVP || "autocivp";
    const githubToken: string | undefined = process.env.GITHUB_TOKEN;

    if (!owner || !repo) {
      console.error("GITHUB_OWNER and AUTOCIVP environment variables must be defined.");
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "GITHUB_OWNER and AUTOCIVP environment variables must be defined." }),
      };
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    const response: Response = await fetch(apiUrl, {
      headers: {
        'Authorization': githubToken ? `token ${githubToken}` : '', // Only add authorization header if token exists
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} - ${response.statusText}`);
      let errorMessage: string = `GitHub API error: ${response.status} - ${response.statusText}`;

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

    const data: GitHubRelease = await response.json();
    console.log('GitHub Data:', data);

    // Construct the ZIP URL directly using the tag_name
    const zipAssetUrl: string = `https://github.com/${owner}/${repo}/archive/refs/tags/${data.tag_name}.zip`;
    console.log("zipAssetUrl", zipAssetUrl)

    const zipResponse: Response = await fetch(zipAssetUrl);
    if (!zipResponse.ok) {
      console.error(`Error downloading ZIP file: ${zipResponse.status} - ${zipResponse.statusText}`);
      return {
        statusCode: zipResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: `Error downloading ZIP file: ${zipResponse.status} - ${zipResponse.statusText}` }),
      };
    }

    const zipBuffer: ArrayBuffer = await zipResponse.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="autocivp.zip"`,
      },
      body: Buffer.from(zipBuffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error: any) { // Type error as any since the error object can be anything
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

export { handler };
