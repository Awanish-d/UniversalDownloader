// ======================================
// YouTube Platform Adapter
// ======================================

const FASTSAVER_BASE =
    "https://api.fastsaver.io";


// ======================================
// GET YOUTUBE VIDEO ID
// ======================================

function getYouTubeVideoId(url) {

    try {

        const parsed =
            new URL(url);


        // youtube.com/watch?v=VIDEO_ID

        if (
            parsed.hostname ===
                "youtube.com" ||
            parsed.hostname ===
                "www.youtube.com" ||
            parsed.hostname ===
                "m.youtube.com"
        ) {

            const videoId =
                parsed.searchParams.get("v");

            if (videoId) {

                return videoId;
            }


            // youtube.com/shorts/VIDEO_ID

            const shortsMatch =
                parsed.pathname.match(
                    /^\/shorts\/([^/?]+)/
                );

            if (shortsMatch) {

                return shortsMatch[1];
            }


            // youtube.com/embed/VIDEO_ID

            const embedMatch =
                parsed.pathname.match(
                    /^\/embed\/([^/?]+)/
                );

            if (embedMatch) {

                return embedMatch[1];
            }
        }


        // youtu.be/VIDEO_ID

        if (
            parsed.hostname ===
            "youtu.be"
        ) {

            const videoId =
                parsed.pathname
                    .split("/")
                    .filter(Boolean)[0];

            if (videoId) {

                return videoId;
            }
        }


        return null;

    } catch {

        return null;
    }
}


// ======================================
// FASTSAVER YOUTUBE INFO
// ======================================

async function fetchYouTubeInfo(url) {

    const apiKey =
        process.env.FASTSAVER_API_KEY;


    if (!apiKey) {

        throw new Error(
            "FastSaver API key is not configured."
        );
    }


    const endpoint =
        `${FASTSAVER_BASE}/v1/youtube/info` +
        `?url=${encodeURIComponent(url)}`;


    const response =
        await fetch(
            endpoint,
            {
                method: "GET",

                headers: {
                    "X-Api-Key":
                        apiKey
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            "FastSaver YouTube info request failed."
        );
    }


    if (!data?.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            "FastSaver could not analyze this YouTube URL."
        );
    }


    return data;
}


// ======================================
// FASTSAVER YOUTUBE DOWNLOAD
// ======================================

async function fetchYouTubeDownload(
    url,
    format
) {

    const apiKey =
        process.env.FASTSAVER_API_KEY;


    if (!apiKey) {

        throw new Error(
            "FastSaver API key is not configured."
        );
    }


    const endpoint =
        `${FASTSAVER_BASE}/v1/youtube/download`;


    const response =
        await fetch(
            endpoint,
            {
                method: "POST",

                headers: {

                    "X-Api-Key":
                        apiKey,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        url,
                        format
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            "FastSaver YouTube download request failed."
        );
    }


    if (!data?.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            "FastSaver could not prepare the YouTube file."
        );
    }


    if (!data?.download_url) {

        throw new Error(
            "FastSaver did not return a download URL."
        );
    }


    return data;
}


// ======================================
// CREATE SAFE FILENAME
// ======================================

function createDownloadFilename(
    title,
    mediaType
) {

    let name =
        typeof title === "string"
            ? title.trim()
            : "";


    name = name
        .replace(/\s+/g, " ")
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ""
        )
        .trim()
        .replace(/\.+$/, "");


    if (name.length > 100) {

        name =
            name.substring(0, 100).trim();
    }


    if (!name) {

        return mediaType === "AUDIO"
            ? "YouTube_Audio"
            : "YouTube_Video";
    }


    return name;
}


// ======================================
// GET TITLE FROM YOUTUBE OEMBED
// ======================================

async function getYouTubeTitle(url) {

    try {

        const oEmbedUrl =
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}` +
            `&format=json`;


        const response =
            await fetch(oEmbedUrl);


        if (!response.ok) {

            return "";
        }


        const data =
            await response.json();


        return data.title || "";

    } catch {

        return "";
    }
}


// ======================================
// ANALYZE YOUTUBE URL
// ======================================

async function getMediaInfo(url) {

    const videoId =
        getYouTubeVideoId(url);


    if (!videoId) {

        return {

            platform:
                "YouTube",

            url,

            supported:
                false,

            type:
                "platform",

            downloadAvailable:
                false,

            message:
                "Invalid or unsupported YouTube URL."

        };
    }


    try {

        // ----------------------------------
        // FASTSAVER INFO
        // ----------------------------------

        const data =
            await fetchYouTubeInfo(url);


        console.log(
            "YOUTUBE FASTSAVER INFO:",
            JSON.stringify(
                data,
                null,
                2
            )
        );


        // ----------------------------------
        // FORMATS
        // ----------------------------------

        const formats =
            Array.isArray(
                data.formats
            )
                ? data.formats
                : [];


        // ----------------------------------
        // VIDEO FORMATS
        // ----------------------------------

        const videoFormats =
            formats.filter(
                (item) =>
                    String(
                        item.type || ""
                    ).toLowerCase() ===
                    "video"
            );


        // ----------------------------------
        // AUDIO FORMATS
        // ----------------------------------

        const audioFormats =
            formats.filter(
                (item) =>
                    String(
                        item.type || ""
                    ).toLowerCase() ===
                    "audio"
            );


        // ----------------------------------
        // AVAILABLE VIDEO QUALITIES
        // ----------------------------------

        const availableQualities =
            videoFormats.map(
                (item) => ({

                    format:
                        item.format,

                    filesize:
                        item.filesize ||
                        0,

                    type:
                        "video"

                })
            );


        // ----------------------------------
        // AUDIO OPTION
        // ----------------------------------

        const audioOption =
            audioFormats.length > 0
                ? {

                    format:
                        "audio",

                    filesize:
                        audioFormats[0]
                            .filesize ||
                        0,

                    type:
                        "audio"

                }
                : null;


        // ----------------------------------
        // THUMBNAIL
        // ----------------------------------

        const thumbnailUrl =
            data.thumbnail ||
            `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;


        // ----------------------------------
        // RETURN
        // ----------------------------------

        return {

            platform:
                "YouTube",

            url,

            videoId,

            supported:
                true,

            type:
                "platform",

            downloadAvailable:
                videoFormats.length > 0,

            title:
                data.title ||
                "YouTube Video",

            authorName:
                data.author ||
                "",

            thumbnailUrl,

            duration:
                data.duration ||
                0,

            watchUrl:
                `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,

            videoFormats,

            audioFormats,

            formats,

            availableQualities,

            audioOption,

            message:
                formats.length > 0
                    ? "YouTube video analyzed successfully."
                    : "YouTube video detected, but no downloadable formats were returned."

        };

    } catch (error) {

        console.error(
            "FastSaver YouTube analyze error:",
            error.message
        );


        return {

            platform:
                "YouTube",

            url,

            videoId,

            supported:
                true,

            type:
                "platform",

            downloadAvailable:
                false,

            title:
                "YouTube Video",

            authorName:
                "",

            thumbnailUrl:
                `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,

            videoFormats:
                [],

            audioFormats:
                [],

            formats:
                [],

            availableQualities:
                [],

            audioOption:
                null,

            message:
                error.message ||
                "Unable to analyze this YouTube URL."

        };
    }
}


// ======================================
// GET ACTUAL DOWNLOAD SOURCE
// ======================================

async function getMediaSource(
    url,
    format = "720p"
) {

    // ----------------------------------
    // DOWNLOAD FROM FASTSAVER
    // ----------------------------------

    const data =
        await fetchYouTubeDownload(
            url,
            format
        );


    // ----------------------------------
    // MEDIA TYPE
    // ----------------------------------

    const isAudio =
        String(format).toLowerCase() ===
        "audio";


    const mediaType =
        isAudio
            ? "AUDIO"
            : "VIDEO";


    // ----------------------------------
    // GET TITLE
    // ----------------------------------

    let title =
        data.title ||
        data.filename ||
        "";


    if (!title) {

        title =
            await getYouTubeTitle(url);
    }


    // ----------------------------------
    // FILENAME
    // ----------------------------------

    const filename =
        createDownloadFilename(
            title,
            mediaType
        );


    // ----------------------------------
    // RETURN SOURCE
    // ----------------------------------

    return {

        url:
            data.download_url,

        mediaType,

        mimeType:
            isAudio
                ? "audio/mp4"
                : "video/mp4",

        filename,

        headers: {}

    };
}


// ======================================
// EXPORTS
// ======================================

module.exports = {

    getMediaInfo,

    getMediaSource,

    getYouTubeVideoId

};