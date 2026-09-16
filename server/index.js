require("dotenv").config();

const express = require("express");
const cors = require("cors");

const rateLimit = require("express-rate-limit");

const { getPlatformAdapter } = require("./platformManager");

const fs = require("fs");
const path = require("path");

const { downloadFile } = require("./downloader");
const {
    saveFile,
    getFilePath
} = require("./storage");

const {
    createJob,
    getJob,
    updateJob
} = require("./jobs");


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
const analyzeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

app.use("/api/analyze", analyzeLimiter);

function isPrivateHostname(hostname) {
    const host = hostname.toLowerCase();

    // Localhost
    if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1"
    ) {
        return true;
    }

    // IPv4 private/reserved ranges
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;

    // Link-local
    if (/^169\.254\./.test(host)) return true;

    return false;
}


// ===============================
// PLATFORM DETECTION
// ===============================

function detectPlatform(url) {

    try {

        const parsedURL = new URL(url);
        const hostname = parsedURL.hostname.toLowerCase();

        if (
            hostname === "youtube.com" ||
            hostname === "www.youtube.com" ||
            hostname === "m.youtube.com" ||
            hostname === "youtu.be"
        ) {
            return "YouTube";
        }

        if (
            hostname === "instagram.com" ||
            hostname === "www.instagram.com"
        ) {
            return "Instagram";
        }

        if (
            hostname === "pinterest.com" ||
            hostname === "www.pinterest.com" ||
            hostname === "pin.it"
        ) {
            return "Pinterest";
        }

        if (
            hostname === "facebook.com" ||
            hostname === "www.facebook.com" ||
            hostname === "fb.watch"
        ) {
            return "Facebook";
        }

        if (
            hostname === "tiktok.com" ||
            hostname === "www.tiktok.com"
        ) {
            return "TikTok";
        }

        return null;

    } catch {

        return null;
    }
}


// ===============================
// SERVER STATUS
// ===============================

app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        message: "Universal Downloader backend is running!",
        version: "1.0.0"
    });

});

function detectMediaType(url) {

    try {

        const parsedURL = new URL(url);

        const pathname = parsedURL.pathname.toLowerCase();

        if (
            pathname.endsWith(".mp4") ||
            pathname.endsWith(".webm") ||
            pathname.endsWith(".mov")
        ) {
            return "video";
        }

        if (
            pathname.endsWith(".jpg") ||
            pathname.endsWith(".jpeg") ||
            pathname.endsWith(".png") ||
            pathname.endsWith(".webp") ||
            pathname.endsWith(".gif")
        ) {
            return "image";
        }

        if (
            pathname.endsWith(".mp3") ||
            pathname.endsWith(".wav") ||
            pathname.endsWith(".m4a") ||
            pathname.endsWith(".ogg")
        ) {
            return "audio";
        }

        return null;

    } catch {

        return null;
    }
}

// ===============================
// CREATE DOWNLOAD JOB
// ===============================

app.post("/api/jobs", (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
        return res.status(400).json({
            success: false,
            message: "URL is required."
        });
    }

    const cleanURL = url.trim();

    if (cleanURL.length > 2048) {
        return res.status(400).json({
            success: false,
            message: "URL is too long."
        });
    }

    let parsedURL;

    try {
        parsedURL = new URL(cleanURL);
    } catch {
        return res.status(400).json({
            success: false,
            message: "Invalid URL."
        });
    }

    if (
        parsedURL.protocol !== "http:" &&
        parsedURL.protocol !== "https:"
    ) {
        return res.status(400).json({
            success: false,
            message: "Only HTTP and HTTPS URLs are allowed."
        });
    }

    const job = createJob({
        url: cleanURL
    });

    res.status(201).json({
        success: true,
        job: job
    });
});
// ===============================
// GET JOB STATUS
// ===============================

app.get("/api/jobs", (req, res) => {
    const jobs = require("./jobs").getAllJobs();

    res.json({
        success: true,
        count: jobs.length,
        jobs: jobs
    });
});

app.get("/api/jobs/:id", (req, res) => {

    const { id } = req.params;

    const job = getJob(id);


    if (!job) {

        return res.status(404).json({
            success: false,
            message: "Job not found."
        });

    }


    res.json({
        success: true,
        job: job
    });

});

app.post("/api/test-job", (req, res) => {
    const filePath = path.join(
        __dirname,
        "..",
        "media",
        "test.jpg"
    );

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: "Test image not found."
        });
    }

    res.json({
        success: true,
        message: "Test image is available.",
        filePath: filePath
    });
});

// ===============================
// START JOB PROCESSING
// ===============================

app.post("/api/jobs/:id/process", async (req, res) => {
    const { id } = req.params;

    const job = getJob(id);

    if (!job) {
        return res.status(404).json({
            success: false,
            message: "Job not found."
        });
    }

    if (job.status === "processing") {
        return res.status(409).json({
            success: false,
            message: "Job is already processing."
        });
    }

    updateJob(id, {
        status: "processing",
        progress: 10,
        message: "Processing started."
    });

    res.json({
        success: true,
        message: "Job processing started.",
        job: getJob(id)
    });

    try {

        let mediaType = detectMediaType(job.url);
let downloadURL = job.url;
let downloadFilename = null;
let platform = detectPlatform(job.url);
        

if (!mediaType && !platform) {
    updateJob(id, {
        status: "failed",
        progress: 0,
        message: "Unsupported media URL."
    });

    return;
}

if (!mediaType && platform) {

    const adapter = getPlatformAdapter(platform);

    if (!adapter) {
        updateJob(id, {
            status: "failed",
            progress: 0,
            message:
                `${platform} adapter is not available.`
        });

        return;
    }

    const source =
        await adapter.getMediaSource(job.url);

    if (!source) {
        updateJob(id, {
            status: "failed",
            progress: 0,
            message:
                `${platform} media source is not available through an authorized source.`
        });

        return;
    }

    // Use the authorized media URL returned by the platform adapter
    downloadURL = source.url;

    downloadFilename =
    source.filename || null;

    // Convert Instagram API media types
    if (source.mediaType === "IMAGE") {
        mediaType = "image";
    } else if (source.mediaType === "VIDEO") {
        mediaType = "video";
    } else if (source.mediaType === "CAROUSEL_ALBUM") {
        updateJob(id, {
            status: "failed",
            progress: 0,
            message:
                "Carousel downloads are not enabled yet. Single-image and single-video Instagram media are supported."
        });

        return;
    }

    if (!mediaType) {
        updateJob(id, {
            status: "failed",
            progress: 0,
            message:
                "Unsupported Instagram media type."
        });

        return;
    }
}


        updateJob(id, {
            progress: 30,
            message: "Downloading media..."
        });

       let downloaded;

const cleanURL = job.url.trim();

const isLocalTestMedia =
    cleanURL === "http://127.0.0.1:5500/media/test.jpg" ||
    cleanURL === "http://localhost:5500/media/test.jpg";

if (isLocalTestMedia) {
    const localTestPath = path.join(
        __dirname,
        "..",
        "media",
        "test.jpg"
    );

    if (!fs.existsSync(localTestPath)) {
        throw new Error("Local test media file not found.");
    }

    downloaded = {
        buffer: fs.readFileSync(localTestPath),
        contentType: "image/jpeg"
    };
} else {
    downloaded = await downloadFile(downloadURL);
}

const extensionMap = {
    image: "jpg",
    video: "mp4",
    audio: "mp3"
};

const extension =
    extensionMap[mediaType] || "bin";

const filePath = saveFile(
    id,
    downloaded.buffer,
    extension,
    downloadFilename
);

updateJob(id, {
    progress: 80,
    message: "Media saved successfully.",
    filePath: filePath
});

        updateJob(id, {
    status: "completed",
    progress: 100,
    message:
        "Direct media processed successfully.",
    filePath: filePath
});

        console.log(
            `Job ${id} completed. Downloaded ${downloaded.buffer.length} bytes.`
        );

    } catch (error) {
        console.error(
            `Job ${id} failed:`,
            error.message
        );

       updateJob(id, {
    status: "failed",
    progress: 0,
    message: error.message || "Media processing failed."
});
    }
});
// ===============================
// ANALYZE URL
// ===============================

app.post("/api/analyze",async (req, res) => {

    const { url } = req.body;

    if (!url || typeof url !== "string") {

        return res.status(400).json({
            success: false,
            message: "Please provide a URL."
        });

    }

    const cleanURL = url.trim();

    let parsedURL;

    try {

        parsedURL = new URL(cleanURL);

    } catch {

        return res.status(400).json({
            success: false,
            message: "Please enter a valid URL."
        });

    }


if (
    parsedURL.protocol !== "https:" &&
    parsedURL.protocol !== "http:"
) {
    return res.status(400).json({
        success: false,
        message: "Only HTTP and HTTPS URLs are supported."
    });
}

if (isPrivateHostname(parsedURL.hostname)) {
    return res.status(400).json({
        success: false,
        message: "Private or local URLs are not allowed."
    });
}


    const platform = detectPlatform(cleanURL);
    const isLocalTestMedia =
    cleanURL === "http://127.0.0.1:5500/media/test.jpg" ||
    cleanURL === "http://localhost:5500/media/test.jpg";

    const mediaType = detectMediaType(cleanURL);
    if (isLocalTestMedia) {

    return res.json({

        success: true,

        type: "direct-media",

        mediaType: "image",

        platform: "Local Test",

        downloadAvailable: true,

        downloadUrl: cleanURL,

        message: "Local test image detected successfully."

    });

}


    // Direct media URL
    if (mediaType) {

        return res.json({

            success: true,

            type: "direct-media",

            mediaType: mediaType,

            platform: platform,

            downloadAvailable: true,

            downloadUrl: cleanURL,

            message: "Direct media file detected."

        });

    }


    // Supported platform URL
    if (platform) {

    const adapter = getPlatformAdapter(platform);

    if (!adapter) {
        return res.json({
            success: false,
            message: "Platform adapter not available."
        });
    }

   const mediaInfo = await adapter.getMediaInfo(cleanURL);

    return res.json({
        success: true,
        ...mediaInfo
    });
}

    return res.json({

        success: false,

        type: "unknown",

        platform: null,

        downloadAvailable: false,

        message: "This URL is not a supported media URL."

    });

});
// ===============================
// LOCAL TEST DOWNLOAD
// ===============================

app.get("/api/download-test", (req, res) => {
    const filePath = path.join(
        __dirname,
        "..",
        "media",
        "test.jpg"
    );

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: "Test image not found."
        });
    }

    res.download(
        filePath,
        "UniversalDownloader-test.jpg",
        (error) => {
            if (error) {
                console.error(
                    "Download error:",
                    error.message
                );
            }
        }
    );
});

app.get("/api/jobs/:id/download", (req, res) => {
    const { id } = req.params;

    const job = getJob(id);

    if (!job) {
        return res.status(404).json({
            success: false,
            message: "Job not found."
        });
    }

    if (job.status !== "completed" || !job.filePath) {
        return res.status(404).json({
            success: false,
            message: "Download file is not ready."
        });
    }

    res.download(
    job.filePath,
    path.basename(job.filePath),
        (error) => {
            if (error) {
                console.error(
                    "File download error:",
                    error.message
                );
            }
        }
    );
});

// ===============================
// INSTAGRAM API TEST
// ===============================

app.get("/api/instagram/profile", async (req, res) => {
    try {
        const token = process.env.INSTAGRAM_ACCESS_TOKEN;

        if (!token) {
            return res.status(500).json({
                success: false,
                message: "Instagram access token is not configured."
            });
        }

        const response = await fetch(
            `https://graph.instagram.com/me?fields=id,user_id,username&access_token=${encodeURIComponent(token)}`
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: "Instagram API request failed.",
                error: data
            });
        }

        res.json({
            success: true,
            message: "Instagram API connected successfully.",
            instagram: data
        });

    } catch (error) {
        console.error("Instagram API error:", error.message);

        res.status(500).json({
            success: false,
            message: "Instagram API connection failed."
        });
    }
});
// ===============================
// INSTAGRAM MEDIA TEST
// ===============================

app.get("/api/instagram/media", async (req, res) => {
    try {
        const token = process.env.INSTAGRAM_ACCESS_TOKEN;

        if (!token) {
            return res.status(500).json({
                success: false,
                message: "Instagram access token is not configured."
            });
        }

        const response = await fetch(
            `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${encodeURIComponent(token)}`
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: "Instagram media API request failed.",
                error: data
            });
        }

        res.json({
            success: true,
            count: data.data?.length || 0,
            media: data.data || []
        });

    } catch (error) {
        console.error("Instagram media API error:", error.message);

        res.status(500).json({
            success: false,
            message: "Instagram media request failed."
        });
    }
});

app.get("/api/instagram/test/:mediaId", async (req, res) => {
    try {
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

        if (!accessToken) {
            return res.status(500).json({
                success: false,
                message: "Instagram access token is not configured."
            });
        }

        const mediaId = req.params.mediaId;

        const url =
    `https://graph.instagram.com/${encodeURIComponent(mediaId)}` +
    `?fields=id,media_type,media_url,thumbnail_url,permalink` +
    `&access_token=${encodeURIComponent(accessToken)}`;

        const response = await fetch(url);
        const data = await response.json();

        return res.status(response.ok ? 200 : response.status).json({
            success: response.ok,
            instagram: data
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ======================================
// INSTAGRAM CAROUSEL ITEM DOWNLOAD
// ======================================

app.get(
    "/api/instagram/carousel-download",
    async (req, res) => {

        try {

            const url =
                String(req.query.url || "").trim();

            const index =
                Number(req.query.index);

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Instagram URL is required."
                });
            }

            if (
                !Number.isInteger(index) ||
                index < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid carousel item."
                });
            }

            const platform =
                detectPlatform(url);

            if (platform !== "Instagram") {
                return res.status(400).json({
                    success: false,
                    message:
                        "This endpoint supports Instagram only."
                });
            }

            const adapter =
                getPlatformAdapter("Instagram");

            if (!adapter) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Instagram adapter is not available."
                });
            }

            // Get all carousel media items
            const mediaInfo =
                await adapter.getMediaInfo(url);

            const mediaItems =
                Array.isArray(
                    mediaInfo.mediaItems
                )
                    ? mediaInfo.mediaItems
                    : [];

            if (mediaItems.length <= 1) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This Instagram post is not a carousel."
                });
            }

            if (index >= mediaItems.length) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Carousel item does not exist."
                });
            }

            const item =
                mediaItems[index];

            if (!item || !item.url) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Carousel media is not available."
                });
            }

            const isVideo =
                String(item.type || "")
                    .toLowerCase() === "video";

            const extension =
                isVideo
                    ? "mp4"
                    : "jpg";

            const baseName =
                mediaInfo.title &&
                mediaInfo.title !==
                    "Instagram media"
                    ? mediaInfo.title
                    : "Instagram_Carousel";

            const filename =
                `${baseName}_${index + 1}`;

            // Fetch the actual media
            const downloaded =
                await downloadFile(item.url);

            if (
                !downloaded ||
                !downloaded.buffer
            ) {
                throw new Error(
                    "Could not download carousel media."
                );
            }

            // Save with a readable filename
            const filePath =
                saveFile(
                    `carousel_${Date.now()}_${index}`,
                    downloaded.buffer,
                    extension,
                    filename
                );

            console.log(
                `Instagram carousel item ${index + 1} downloaded. ` +
                `${downloaded.buffer.length} bytes.`
            );

            res.download(
                filePath,
                path.basename(filePath),
                (error) => {

                    if (error) {

                        console.error(
                            "Carousel download error:",
                            error.message
                        );

                    }

                }
            );

        } catch (error) {

            console.error(
                "Instagram carousel download failed:",
                error.message
            );

            if (!res.headersSent) {

                res.status(500).json({
                    success: false,
                    message:
                        error.message ||
                        "Carousel download failed."
                });

            }

        }

    }
);

// ======================================
// PINTEREST CAROUSEL DOWNLOAD
// ======================================

app.get(
    "/api/pinterest/carousel-download",
    async (req, res) => {

        try {

            const url =
                String(
                    req.query.url || ""
                ).trim();

            const index =
                Number(req.query.index);


            // ------------------------------
            // VALIDATION
            // ------------------------------

            if (!url) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Pinterest URL is required."

                });
            }


            if (
                !Number.isInteger(index) ||
                index < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid Pinterest item."

                });
            }


            // ------------------------------
            // PLATFORM CHECK
            // ------------------------------

            const platform =
                detectPlatform(url);

            if (
                platform !== "Pinterest"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This endpoint supports Pinterest only."

                });
            }


            // ------------------------------
            // GET PINTEREST ADAPTER
            // ------------------------------

            const adapter =
                getPlatformAdapter(
                    "Pinterest"
                );

            if (!adapter) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Pinterest adapter is not available."

                });
            }


            // ------------------------------
            // ANALYZE AGAIN
            // ------------------------------

            const mediaInfo =
                await adapter.getMediaInfo(
                    url
                );

            const mediaItems =
                Array.isArray(
                    mediaInfo.mediaItems
                )
                    ? mediaInfo.mediaItems
                    : [];


            // ------------------------------
            // CHECK ITEMS
            // ------------------------------

            if (
                mediaItems.length <= 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This Pinterest post is not a multi-item album."

                });
            }


            if (
                index >= mediaItems.length
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Pinterest item does not exist."

                });
            }


            const item =
                mediaItems[index];


            if (
                !item ||
                !item.url
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Pinterest media is not available."

                });
            }


            // ------------------------------
            // MEDIA TYPE
            // ------------------------------

            const isVideo =
                String(
                    item.type || ""
                ).toLowerCase() ===
                "video";


            const extension =
                isVideo
                    ? "mp4"
                    : "jpg";


            // ------------------------------
            // FILENAME
            // ------------------------------

            const baseName =
                mediaInfo.title &&
                mediaInfo.title !==
                    "Pinterest media"
                    ? mediaInfo.title
                    : "Pinterest_Album";


            const filename =
                `${baseName}_${index + 1}`;


            // ------------------------------
            // DOWNLOAD FROM FASTSAVER
            // ------------------------------

            const downloaded =
                await downloadFile(
                    item.url
                );


            if (
                !downloaded ||
                !downloaded.buffer
            ) {

                throw new Error(
                    "Could not download Pinterest media."
                );
            }


            // ------------------------------
            // SAVE FILE
            // ------------------------------

            const filePath =
                saveFile(
                    `pinterest_${Date.now()}_${index}`,
                    downloaded.buffer,
                    extension,
                    filename
                );


            console.log(
                `Pinterest album item ${index + 1} downloaded. ` +
                `${downloaded.buffer.length} bytes.`
            );


            // ------------------------------
            // SEND FILE
            // ------------------------------

            res.download(
                filePath,
                path.basename(filePath),
                (error) => {

                    if (error) {

                        console.error(
                            "Pinterest download error:",
                            error.message
                        );
                    }
                }
            );

        } catch (error) {

            console.error(
                "Pinterest carousel download failed:",
                error.message
            );


            if (!res.headersSent) {

                res.status(500).json({

                    success: false,

                    message:
                        error.message ||
                        "Pinterest download failed."

                });
            }
        }
    }
);

// ======================================
// YOUTUBE DOWNLOAD
// ======================================

app.get(
    "/api/youtube/download",
    async (req, res) => {

        try {

            const url =
                String(
                    req.query.url || ""
                ).trim();

            const format =
                String(
                    req.query.format || ""
                ).trim();

            // ------------------------------
            // VALIDATION
            // ------------------------------

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message:
                        "YouTube URL is required."
                });
            }

            if (!format) {
                return res.status(400).json({
                    success: false,
                    message:
                        "YouTube format is required."
                });
            }

            // ------------------------------
            // PLATFORM CHECK
            // ------------------------------

            const platform =
                detectPlatform(url);

            if (platform !== "YouTube") {
                return res.status(400).json({
                    success: false,
                    message:
                        "This endpoint supports YouTube only."
                });
            }

            // ------------------------------
            // GET YOUTUBE ADAPTER
            // ------------------------------

            const adapter =
                getPlatformAdapter(
                    "YouTube"
                );

            if (!adapter) {
                return res.status(500).json({
                    success: false,
                    message:
                        "YouTube adapter is not available."
                });
            }

            // ------------------------------
            // GET ACTUAL DOWNLOAD SOURCE
            // ------------------------------

            const source =
                await adapter.getMediaSource(
                    url,
                    format
                );

            if (
                !source ||
                !source.url
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "YouTube download source is not available."
                });
            }

            // ------------------------------
            // MEDIA TYPE
            // ------------------------------

            const isAudio =
                String(
                    source.mediaType || ""
                ).toUpperCase() ===
                "AUDIO";

            const extension =
                isAudio
                    ? "m4a"
                    : "mp4";

            // ------------------------------
            // FILENAME
            // ------------------------------

            const filename =
                source.filename ||
                (
                    isAudio
                        ? "YouTube_Audio"
                        : `YouTube_Video_${format}`
                );

            // ------------------------------
            // DOWNLOAD MEDIA
            // ------------------------------

            const downloaded =
                await downloadFile(
                    source.url
                );

            if (
                !downloaded ||
                !downloaded.buffer
            ) {
                throw new Error(
                    "Could not download YouTube media."
                );
            }

            // ------------------------------
            // SAVE FILE
            // ------------------------------

            const filePath =
                saveFile(
                    `youtube_${Date.now()}`,
                    downloaded.buffer,
                    extension,
                    filename
                );

            console.log(
                `YouTube ${format} downloaded. ` +
                `${downloaded.buffer.length} bytes.`
            );

            // ------------------------------
            // SEND FILE
            // ------------------------------

            res.download(
                filePath,
                path.basename(filePath),
                (error) => {

                    if (error) {
                        console.error(
                            "YouTube download error:",
                            error.message
                        );
                    }

                }
            );

        } catch (error) {

            console.error(
                "YouTube download failed:",
                error.message
            );

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message:
                        error.message ||
                        "YouTube download failed."
                });
            }

        }

    }
);

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});