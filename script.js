const urlInput = document.getElementById("urlInput");
const analyzeBtn = document.getElementById("analyzeBtn");

let currentJobId = null;
let downloadReady = false;

const result = document.getElementById("result");
const platformName = document.getElementById("platformName");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

const mediaPreview = document.getElementById("mediaPreview");
const mediaType = document.getElementById("mediaType");
const mediaFormat = document.getElementById("mediaFormat");

const downloadBtn = document.getElementById("downloadBtn");


// Download button शुरुआत में hidden
downloadBtn.style.display = "none";


// ======================================
// RESET RESULT
// ======================================

function resetResult() {

    result.style.display = "none";

    downloadBtn.style.display = "none";

    mediaPreview.innerHTML = `
        <div class="preview-placeholder">
            📁
            <span>Media Preview</span>
        </div>
    `;

    mediaType.textContent = "-";

    mediaFormat.textContent = "-";
}


// ======================================
// GET FILE FORMAT
// ======================================

function getFormat(url) {

    try {

        const pathname =
            new URL(url).pathname.toLowerCase();

        const extension =
            pathname.split(".").pop();

        return extension || "Unknown";

    } catch {

        return "Unknown";

    }
}


// ======================================
// SHOW IMAGE PREVIEW
// ======================================

function showImagePreview(url) {

    mediaPreview.innerHTML = `
        <img
            src="${url}"
            alt="Media preview"
            style="
                width:100%;
                max-height:450px;
                object-fit:contain;
                display:block;
            "
        >
    `;
}


// ======================================
// SHOW VIDEO PREVIEW
// ======================================

function showVideoPreview(url) {

    mediaPreview.innerHTML = `
        <video
            controls
            style="
                width:100%;
                max-height:450px;
                display:block;
            "
        >
            <source src="${url}">
            Your browser does not support video playback.
        </video>
    `;
}


// ======================================
// SHOW AUDIO PREVIEW
// ======================================

function showAudioPreview(url) {

    mediaPreview.innerHTML = `
        <div
            style="
                min-height:240px;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-direction:column;
                gap:20px;
            "
        >

            <div style="font-size:60px;">
                🎵
            </div>

            <audio
                controls
                src="${url}"
            >
            </audio>

        </div>
    `;
}

// ======================================
// SHOW INSTAGRAM CAROUSEL
// ======================================

function showCarouselItems(items) {

    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    mediaPreview.innerHTML = `
        <div
            style="
                display:flex;
                flex-direction:column;
                gap:16px;
                width:100%;
            "
        >
            ${items.map((item, index) => {

                const type =
                    String(item.type || "image")
                        .toLowerCase();

                const isVideo =
                    type === "video";

                const format =
                    isVideo
                        ? "MP4"
                        : "JPG";

                return `
                    <div
                        style="
                            border:1px solid #e5e7eb;
                            border-radius:14px;
                            padding:12px;
                            background:#ffffff;
                        "
                    >

                        <div
                            style="
                                font-weight:700;
                                margin-bottom:10px;
                            "
                        >
                            Item ${index + 1}
                        </div>

                        ${
                            isVideo
                                ? `
                                    <video
                                        controls
                                        src="${item.url}"
                                        style="
                                            width:100%;
                                            max-height:400px;
                                            object-fit:contain;
                                            display:block;
                                            border-radius:10px;
                                        "
                                    ></video>
                                `
                                : `
                                    <img
                                        src="${
                                            item.thumbnailUrl ||
                                            item.url
                                        }"
                                        alt="Carousel item ${
                                            index + 1
                                        }"
                                        style="
                                            width:100%;
                                            max-height:400px;
                                            object-fit:contain;
                                            display:block;
                                            border-radius:10px;
                                        "
                                    >
                                `
                        }

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:10px;
                                margin-top:12px;
                            "
                        >

                            <div>
                                <div
                                    style="
                                        font-size:12px;
                                        color:#6b7280;
                                    "
                                >
                                    Type
                                </div>

                                <strong>
                                    ${
                                        isVideo
                                            ? "VIDEO"
                                            : "IMAGE"
                                    }
                                </strong>
                            </div>

                            <div>
                                <div
                                    style="
                                        font-size:12px;
                                        color:#6b7280;
                                    "
                                >
                                    Format
                                </div>

                                <strong>
                                    ${format}
                                </strong>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="carousel-download-btn"
                            data-carousel-index="${index}"
                            style="
                                width:100%;
                                margin-top:12px;
                                padding:11px 16px;
                                border:0;
                                border-radius:9px;
                                background:#111827;
                                color:white;
                                font-weight:600;
                                cursor:pointer;
                            "
                        >
                            Download ${
                                isVideo
                                    ? "Video"
                                    : "Image"
                            }
                        </button>

                    </div>
                `;

            }).join("")}
        </div>
    `;
}

// ======================================
// SHOW YOUTUBE DOWNLOAD OPTIONS
// ======================================

function showYouTubeDownloadOptions(data) {

    const qualities =
        Array.isArray(data.availableQualities)
            ? data.availableQualities
            : [];

    const audioOption =
        data.audioOption || null;

    let qualityHTML = "";

    qualities.forEach((item) => {

        if (!item || !item.format) {
            return;
        }

        const size =
            item.filesize
                ? ` (${formatFileSize(item.filesize)})`
                : "";

        qualityHTML += `
            <button
                type="button"
                class="youtube-download-btn"
                data-youtube-format="${item.format}"
                style="
                    padding:10px 15px;
                    border:0;
                    border-radius:8px;
                    background:#111827;
                    color:white;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                ${item.format}${size}
            </button>
        `;
    });


    let audioHTML = "";

    if (audioOption) {

        const audioSize =
            audioOption.filesize
                ? ` (${formatFileSize(audioOption.filesize)})`
                : "";

        audioHTML = `
            <button
                type="button"
                class="youtube-download-btn"
                data-youtube-format="audio"
                style="
                    width:100%;
                    padding:12px 16px;
                    border:0;
                    border-radius:8px;
                    background:#111827;
                    color:white;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                🎵 Download Audio${audioSize}
            </button>
        `;
    }


    mediaPreview.innerHTML = `
        <div style="width:100%;">

            ${
                data.thumbnailUrl
                    ? `
                        <img
                            src="${data.thumbnailUrl}"
                            alt="YouTube Preview"
                            style="
                                width:100%;
                                max-height:450px;
                                object-fit:contain;
                                display:block;
                                border-radius:10px;
                            "
                        >
                    `
                    : ""
            }


            <div
                style="
                    margin-top:15px;
                    padding:16px;
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    background:white;
                "
            >

                <div
                    style="
                        font-weight:700;
                        margin-bottom:12px;
                    "
                >
                    Download Video
                </div>


                <div
                    style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:10px;
                    "
                >
                    ${qualityHTML}
                </div>


                ${
                    audioHTML
                        ? `
                            <div style="margin-top:14px;">
                                ${audioHTML}
                            </div>
                        `
                        : ""
                }

            </div>

        </div>
    `;
}


// ======================================
// FORMAT FILE SIZE
// ======================================

function formatFileSize(bytes) {

    const value =
        Number(bytes) || 0;

    if (value <= 0) {
        return "";
    }

    const units =
        ["B", "KB", "MB", "GB"];

    let size = value;
    let index = 0;

    while (
        size >= 1024 &&
        index < units.length - 1
    ) {
        size =
            size / 1024;

        index++;
    }

    return `${size.toFixed(1)} ${units[index]}`;
}


// ======================================
// YOUTUBE DOWNLOAD BUTTON
// ======================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".youtube-download-btn"
            );

        if (!button) {
            return;
        }


        const format =
            button.dataset.youtubeFormat;

        const url =
            urlInput.value.trim();


        if (!url) {

            alert(
                "YouTube URL is missing."
            );

            return;
        }


        if (!format) {

            alert(
                "YouTube format is missing."
            );

            return;
        }


        const originalText =
            button.textContent;


        button.disabled = true;

        button.textContent =
            "Preparing...";


        try {

            const endpoint =
                "https://universaldownloader-3125.onrender.com/api/youtube/download" +
                `?url=${encodeURIComponent(url)}` +
                `&format=${encodeURIComponent(format)}`;


            const response =
                await fetch(endpoint);


            if (!response.ok) {

                let message =
                    "YouTube download failed.";

                try {

                    const errorData =
                        await response.json();

                    message =
                        errorData.message ||
                        message;

                } catch {}

                throw new Error(
                    message
                );
            }


            const blob =
                await response.blob();


            if (
                !blob ||
                blob.size === 0
            ) {

                throw new Error(
                    "Downloaded file is empty."
                );
            }


            const downloadURL =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");


            link.href =
                downloadURL;


            link.download =
                "";


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            URL.revokeObjectURL(
                downloadURL
            );


            button.textContent =
                "Downloaded ✓";


        } catch (error) {

            console.error(
                "YouTube download error:",
                error
            );


            alert(
                error.message ||
                "Could not download YouTube media."
            );


            button.textContent =
                originalText;

        } finally {

            button.disabled =
                false;
        }
    }
);

// ======================================
// CAROUSEL ITEM DOWNLOAD
// ======================================

document.addEventListener("click", async (event) => {

    const button =
        event.target.closest(
            ".carousel-download-btn"
        );

    if (!button) {
        return;
    }

    const index =
        Number(
            button.dataset.carouselIndex
        );

    const url =
        urlInput.value.trim();

    if (!url) {
        alert("Instagram URL is missing.");
        return;
    }

    if (!Number.isInteger(index)) {
        alert("Invalid carousel item.");
        return;
    }

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent =
        "Preparing...";

    try {

        let carouselEndpoint;

if (
    url.includes("pinterest.com") ||
    url.includes("pin.it")
) {
    carouselEndpoint =
        "https://universaldownloader-3125.onrender.com/api/pinterest/carousel-download";
} else {
    carouselEndpoint =
        "https://universaldownloader-3125.onrender.com/api/instagram/carousel-download";
}

const endpoint =
    carouselEndpoint +
    `?url=${encodeURIComponent(url)}` +
    `&index=${index}`;

        const response =
            await fetch(endpoint);

        if (!response.ok) {

            let message =
                "Carousel item download failed.";

            try {

                const data =
                    await response.json();

                message =
                    data.message ||
                    message;

            } catch {
                // Server did not return JSON
            }

            throw new Error(message);
        }

        const blob =
            await response.blob();

        if (!blob || blob.size === 0) {
            throw new Error(
                "Downloaded file is empty."
            );
        }

        const downloadURL =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = downloadURL;

        // Browser will use the filename
        // sent by the backend.
        link.download = "";

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(
            downloadURL
        );

        button.textContent =
            "Downloaded ✓";

    } catch (error) {

        console.error(
            "Carousel item download error:",
            error
        );

        alert(
            error.message ||
            "Could not download this carousel item."
        );

        button.textContent =
            originalText;

    } finally {

        button.disabled = false;

    }

});

async function checkJobStatus() {

    if (!currentJobId) {
        return;
    }


    try {

        const response = await fetch(
            `https://universaldownloader-3125.onrender.com/api/jobs/${currentJobId}`
        );

        const data = await response.json();


        if (!data.success) {

            return;

        }


        const job = data.job;


        // Processing
        if (job.status === "processing") {

            result.style.display = "flex";

            platformName.textContent =
                "PROCESSING";

            resultTitle.textContent =
                "Processing your media...";

            resultMessage.textContent =
                `Please wait... ${job.progress || 0}% complete.`;

            setTimeout(
                checkJobStatus,
                700
            );

            return;
        }


        // Completed
        if (job.status === "completed") {

            

            result.style.display = "flex";

            platformName.textContent =
                "COMPLETED";

            resultTitle.textContent =
                "Processing completed";

            resultMessage.textContent =
                "Your job has been completed successfully.";

            downloadBtn.href =
    `https://universaldownloader-3125.onrender.com/api/jobs/${currentJobId}/download`;

downloadBtn.style.display = "inline-flex";

downloadBtn.disabled = false;
downloadBtn.textContent = "Download";

downloadReady = true;

// Start the actual browser download
setTimeout(() => {
    downloadBtn.click();
}, 300);

return;
        }

// Failed
if (job.status === "failed") {

    mediaType.textContent = "FAILED";

    result.style.display = "flex";

    platformName.textContent =
        "FAILED";

    resultTitle.textContent =
        "Processing failed";

    resultMessage.textContent =
        job.message ||
        "The job could not be completed.";

    downloadBtn.disabled = false;
    downloadBtn.textContent = "Try Again";

    downloadBtn.onclick = () => {
        downloadBtn.onclick = null;
        downloadBtn.textContent = "Download";
        downloadBtn.disabled = false;
    };

    return;
}


        // Queued
        setTimeout(
            checkJobStatus,
            700
        );

    }

    catch (error) {

        console.error(
            "Status check failed:",
            error
        );

    }

}


// ======================================
// ANALYZE URL
// ======================================

// ======================================
// ANALYZE URL
// UNIVERSAL PREVIEW FLOW
// ======================================

async function analyzeURL() {

    const url = urlInput.value.trim();
    downloadReady = false;
downloadBtn.style.display = "none";

    if (!url) {
        alert("Please paste a URL first.");
        urlInput.focus();
        return;
    }

    resetResult();

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    currentJobId = null;

    try {

        // ==================================
        // CALL BACKEND ANALYZE API
        // ==================================

        const response = await fetch(
            "https://universaldownloader-3125.onrender.com/api/analyze",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    url: url
                })
            }
        );

        const data = await response.json();

        // ==================================
        // BACKEND ERROR
        // ==================================

        if (!data.success) {

            result.style.display = "flex";

            platformName.textContent =
                "UNSUPPORTED";

            resultTitle.textContent =
                "Unable to process this link";

            resultMessage.textContent =
                data.message ||
                "Unsupported URL.";

            mediaType.textContent = "-";
            mediaFormat.textContent = "-";

            return;
        }


        // ==================================
        // BASIC PLATFORM INFORMATION
        // ==================================

        const platform =
            data.platform || "MEDIA";

        platformName.textContent =
            platform;

        result.style.display = "flex";


        // ==================================
        // DIRECT MEDIA
        // ==================================

        if (
            data.type === "direct-media" &&
            data.downloadUrl
        ) {

            const type =
                data.mediaType || "unknown";

            const format =
                getFormat(data.downloadUrl);


            mediaType.textContent =
                type.toUpperCase();

            mediaFormat.textContent =
                format.toUpperCase();


            // Image
            if (type === "image") {

                showImagePreview(
                    data.downloadUrl
                );
            }


            // Video
            else if (type === "video") {

                showVideoPreview(
                    data.downloadUrl
                );
            }


            // Audio
            else if (type === "audio") {

                showAudioPreview(
                    data.downloadUrl
                );
            }


            resultTitle.textContent =
                "Media ready";

            resultMessage.textContent =
                "Media detected successfully.";

            return;
        }


        // ==================================
        // PLATFORM MEDIA
        // ==================================

        resultTitle.textContent =
            data.title ||
            `${platform} media detected`;

        mediaType.textContent =
            platform.toUpperCase();

        mediaFormat.textContent =
            "PREVIEW";


        // ==================================
        // PLATFORM MEDIA ITEMS
        // ==================================
const mediaItems =
    Array.isArray(data.mediaItems)
        ? data.mediaItems
        : [];


// ==================================
// YOUTUBE DOWNLOAD OPTIONS
// ==================================

if (
    platform.toLowerCase() === "youtube" &&
    (
        Array.isArray(
            data.availableQualities
        ) ||
        data.audioOption
    )
) {

    showYouTubeDownloadOptions(
        data
    );

    mediaType.textContent =
        "VIDEO";

    mediaFormat.textContent =
        "SELECT QUALITY";
}


// ==================================
// SHOW ACTUAL MEDIA PREVIEW
// ==================================

if (
    platform.toLowerCase() !== "youtube" &&
    mediaItems.length > 0
) {

            // Instagram carousel
if (mediaItems.length > 1) {

    showCarouselItems(mediaItems);

    mediaType.textContent =
        "CAROUSEL";

    mediaFormat.textContent =
        `${mediaItems.length} ITEMS`;

} else {

            const firstMedia =
                mediaItems[0];


            // VIDEO
            if (
                firstMedia.type === "video" &&
                firstMedia.url
            ) {

                showVideoPreview(
                    firstMedia.url
                );

                mediaType.textContent =
                    "VIDEO";

                mediaFormat.textContent =
                    (
                        firstMedia.mimeType ||
                        "video/mp4"
                    )
                    .split("/")
                    .pop()
                    .toUpperCase();
            }


            // IMAGE
            else if (
                firstMedia.type === "image" &&
                firstMedia.url
            ) {

                showImagePreview(
                    firstMedia.url
                );

                mediaType.textContent =
                    "IMAGE";

                mediaFormat.textContent =
                    (
                        firstMedia.mimeType ||
                        "image/jpeg"
                    )
                    .split("/")
                    .pop()
                    .toUpperCase();
            }


            // AUDIO
            else if (
                firstMedia.type === "audio" &&
                firstMedia.url
            ) {

                showAudioPreview(
                    firstMedia.url
                );

                mediaType.textContent =
                    "AUDIO";

                mediaFormat.textContent =
                    (
                        firstMedia.mimeType ||
                        "audio/mpeg"
                    )
                    .split("/")
                    .pop()
                    .toUpperCase();
            }

        }
    }


        // ==================================
        // FALLBACK THUMBNAIL
        // ==================================

        else if (
    platform.toLowerCase() !== "youtube" &&
    data.thumbnailUrl
) {

            showImagePreview(
                data.thumbnailUrl
            );

            mediaType.textContent =
                platform.toUpperCase();

            mediaFormat.textContent =
                "PREVIEW";
        }


        // ==================================
        // MESSAGE
        // ==================================

        resultMessage.textContent =
            data.message ||
            `${platform} media detected.`;


        // ==================================
        // WATCH / OPEN PLATFORM BUTTON
        // ==================================

        if (data.watchUrl) {

            const watchLabel =
                getPlatformWatchLabel(platform);

            resultMessage.innerHTML = `
                ${data.message || `${platform} media detected.`}
                <br><br>

                <a
                    href="${data.watchUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                        display:inline-block;
                        padding:10px 18px;
                        border-radius:8px;
                        text-decoration:none;
                        background:#111827;
                        color:white;
                        font-weight:600;
                    "
                >
                    ${watchLabel}
                </a>
            `;
        }

// ==================================
// SHOW DOWNLOAD BUTTON
// ==================================

if (
    data.type === "direct-media" &&
    data.downloadAvailable
) {
    downloadBtn.style.display = "inline-flex";
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download";
}
else if (
    data.type === "platform" &&
    platform.toLowerCase() !== "youtube" &&
    Array.isArray(data.mediaItems) &&
    data.mediaItems.length > 0
) {

    if (data.mediaItems.length > 1) {

        // Carousel has individual buttons
        downloadBtn.style.display = "none";

    } else {

        // Single platform media
        downloadBtn.style.display =
            "inline-flex";

        downloadBtn.disabled = false;

        downloadBtn.textContent =
            "Download";
    }
}
else {
    downloadBtn.style.display = "none";
}

    }

    catch (error) {

        console.error(
            "Analyze error:",
            error
        );

        result.style.display = "flex";

        platformName.textContent =
            "ERROR";

        resultTitle.textContent =
            "Backend connection failed";

        resultMessage.textContent =
            error.message ||
            "Something went wrong while processing the request.";

        mediaType.textContent = "-";
        mediaFormat.textContent = "-";
    }

    finally {

        analyzeBtn.disabled = false;

        analyzeBtn.textContent =
            "Analyze";
    }
}


// ======================================
// PLATFORM WATCH BUTTON LABEL
// ======================================

function getPlatformWatchLabel(platform) {

    const name =
        String(platform || "")
            .trim()
            .toLowerCase();


    if (name === "youtube") {
        return "▶ Watch on YouTube";
    }

    if (name === "instagram") {
        return "▶ Watch on Instagram";
    }

    if (name === "facebook") {
        return "▶ Watch on Facebook";
    }

    if (name === "tiktok") {
        return "▶ Watch on TikTok";
    }

    if (name === "pinterest") {
        return "↗ Open on Pinterest";
    }

    return `↗ Open on ${platform}`;
}



// ======================================
// ANALYZE BUTTON
// ======================================

analyzeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    analyzeURL();
});


// ======================================
// DOWNLOAD BUTTON
// ======================================

downloadBtn.addEventListener("click", async (event) => {

    // If the job is already completed,
    // allow the browser to open the download URL.
    if (downloadReady) {
        return;
    }

    event.preventDefault();

    const url = urlInput.value.trim();

    if (!url) {
        alert("Please paste a URL first.");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing...";

    try {

        const response = await fetch(
            "https://universaldownloader-3125.onrender.com/api/jobs",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: url
                })
            }
        );

        const data = await response.json();

        if (!data.success || !data.job) {
            throw new Error(
                data.message ||
                "Could not create download job."
            );
        }

        currentJobId = data.job.id;

        downloadReady = false;

        downloadBtn.textContent = "Processing...";

        const processResponse = await fetch(
            `https://universaldownloader-3125.onrender.com/api/jobs/${currentJobId}/process`,
            {
                method: "POST"
            }
        );

        const processData =
            await processResponse.json();

        if (!processData.success) {
            throw new Error(
                processData.message ||
                "Could not start processing."
            );
        }

        checkJobStatus();

    } catch (error) {

        console.error(
            "Download error:",
            error
        );

        result.style.display = "flex";

        resultTitle.textContent =
            "Download failed";

        resultMessage.textContent =
            error.message ||
            "Something went wrong.";

        downloadReady = false;

        downloadBtn.disabled = false;
        downloadBtn.textContent =
            "Download";
    }

});

// ======================================
// ENTER KEY
// ======================================

urlInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();
            analyzeURL();

        }

    }
);

async function loadJobHistory() {
    const jobHistory = document.getElementById("jobHistory");

    if (!jobHistory) {
        return;
    }

    try {
        const response = await fetch(
            "https://universaldownloader-3125.onrender.com/api/jobs"
        );

        const data = await response.json();

        if (!data.success || !data.jobs.length) {
            jobHistory.innerHTML =
                '<p class="history-empty">No download jobs yet.</p>';
            return;
        }

        jobHistory.innerHTML = data.jobs
            .map((job) => {
                const platform = detectPlatformFromURL(job.url);

                return `
                    <div class="job-item">

                        <div class="job-info">

                            <div class="job-platform">
                                ${platform}
                            </div>

                            <div class="job-url">
                                ${job.url}
                            </div>

                        </div>

                        <div class="job-status">
                            ${job.status}
                        </div>

                    </div>
                `;
            })
            .join("");

    } catch (error) {
        console.error(
            "Could not load job history:",
            error
        );

        jobHistory.innerHTML =
            '<p class="history-empty">Could not load history.</p>';
    }
}


function detectPlatformFromURL(url) {
    try {
        const parsedURL = new URL(url);
        const host = parsedURL.hostname.toLowerCase();

        if (
            host === "youtube.com" ||
            host === "www.youtube.com" ||
            host === "m.youtube.com" ||
            host === "youtu.be"
        ) {
            return "YouTube";
        }

        if (
            host === "instagram.com" ||
            host === "www.instagram.com"
        ) {
            return "Instagram";
        }

        if (
            host === "pinterest.com" ||
            host === "www.pinterest.com" ||
            host === "pin.it"
        ) {
            return "Pinterest";
        }

        if (
            host === "facebook.com" ||
            host === "www.facebook.com" ||
            host === "fb.watch"
        ) {
            return "Facebook";
        }

        if (
            host === "tiktok.com" ||
            host === "www.tiktok.com"
        ) {
            return "TikTok";
        }

        return "Direct Media";

    } catch {
        return "Unknown";
    }
}


loadJobHistory();
    
