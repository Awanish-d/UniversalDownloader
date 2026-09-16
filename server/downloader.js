const https = require("https");
const http = require("http");

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const parsedURL = new URL(url);

        const client =
            parsedURL.protocol === "https:"
                ? https
                : http;

        const request = client.get(url, (response) => {
            // Follow redirects
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                response.resume();

                downloadFile(response.headers.location)
                    .then(resolve)
                    .catch(reject);

                return;
            }

            if (response.statusCode !== 200) {
                response.resume();

                reject(
                    new Error(
                        `Download failed with status ${response.statusCode}`
                    )
                );

                return;
            }

            const chunks = [];

            response.on("data", (chunk) => {
                chunks.push(chunk);
            });

            response.on("end", () => {
                const buffer = Buffer.concat(chunks);

                resolve({
                    buffer: buffer,
                    contentType:
                        response.headers["content-type"] ||
                        "application/octet-stream"
                });
            });

            response.on("error", reject);
        });

        request.setTimeout(15000, () => {
            request.destroy(
                new Error("Download request timed out.")
            );
        });

        request.on("error", reject);
    });
}

module.exports = {
    downloadFile
};