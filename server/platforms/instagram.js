const FASTSAVER_ENDPOINT =
    "https://api.fastsaver.io/v1/fetch";


// ======================================
// FASTSAVER INSTAGRAM REQUEST
// ======================================

async function fetchInstagram(url) {

    const apiKey =
        process.env.FASTSAVER_API_KEY;

    if (!apiKey) {
        throw new Error(
            "FastSaver API key is not configured."
        );
    }

    const endpoint =
        `${FASTSAVER_ENDPOINT}?url=${encodeURIComponent(url)}`;

    const response = await fetch(
        endpoint,
        {
            method: "GET",
            headers: {
                "X-Api-Key": apiKey
            }
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            "FastSaver Instagram request failed."
        );
    }

    if (!data?.ok) {
        throw new Error(
            data?.message ||
            "FastSaver could not process this Instagram URL."
        );
    }

    return data;
}


// ======================================
// ANALYZE INSTAGRAM URL
// ======================================

async function getMediaInfo(url) {

    try {

        const data =
            await fetchInstagram(url);

        const mediaItems = [];

        // ----------------------------------
        // SINGLE VIDEO
        // ----------------------------------

        if (
            data.type === "video" &&
            data.download_url
        ) {

            mediaItems.push({
                type: "video",
                url: data.download_url,
                thumbnailUrl:
                    data.thumbnail_url || null,
                quality: "Video",
                mimeType: "video/mp4",
                width:
                    data.width || 0,
                height:
                    data.height || 0,
                duration:
                    data.duration || 0
            });
        }


        // ----------------------------------
        // SINGLE IMAGE
        // ----------------------------------

        else if (
            data.type === "image" &&
            data.download_url
        ) {

            mediaItems.push({
                type: "image",
                url: data.download_url,
                thumbnailUrl:
                    data.thumbnail_url ||
                    data.download_url,
                quality: "Image",
                mimeType:
                    "image/jpeg",
                width:
                    data.width || 0,
                height:
                    data.height || 0
            });
        }


        // ----------------------------------
        // ALBUM / CAROUSEL
        // ----------------------------------

        else if (
            data.type === "album" &&
            Array.isArray(data.items)
        ) {

            for (
                const item of data.items
            ) {

                if (!item?.download_url) {
                    continue;
                }

                const itemType =
                    item.type === "image"
                        ? "image"
                        : "video";

                mediaItems.push({
                    type: itemType,
                    url: item.download_url,
                    thumbnailUrl:
                        item.thumbnail_url ||
                        null,
                    quality:
                        itemType === "video"
                            ? "Video"
                            : "Image",
                    mimeType:
                        itemType === "video"
                            ? "video/mp4"
                            : "image/jpeg",
                    width:
                        item.width || 0,
                    height:
                        item.height || 0,
                    duration:
                        item.duration || 0
                });
            }
        }


        return {

            platform: "Instagram",

            url: url,

            supported: true,

            type: "platform",

            downloadAvailable:
                mediaItems.length > 0,

            previewOnly: false,

            title:
                data.caption ||
                "Instagram media",

            authorName: "",

            thumbnailUrl:
                data.thumbnail_url || null,

            duration:
                data.duration || 0,

            mediaItems:

                mediaItems,

            mediaCount:
                mediaItems.length,

            watchUrl:
                url,

            message:
                mediaItems.length > 0
                    ? "Instagram media detected successfully."
                    : "Instagram media was not returned."
        };

    } catch (error) {

        console.error(
            "FastSaver Instagram analyze error:",
            error.message
        );

        return {

            platform: "Instagram",

            url: url,

            supported: true,

            type: "platform",

            downloadAvailable: false,

            previewOnly: true,

            mediaItems: [],

            mediaCount: 0,

            message:
                error.message ||
                "Unable to analyze this Instagram URL."
        };
    }
}

// ======================================
// CREATE SAFE DOWNLOAD FILENAME
// ======================================

function createDownloadFilename(
    caption,
    mediaType
) {

    let name =
        typeof caption === "string"
            ? caption.trim()
            : "";

    name = name
        .replace(/\s+/g, " ")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim();

    if (name.length > 100) {
        name =
            name.substring(0, 100).trim();
    }

    if (!name) {

        if (mediaType === "VIDEO") {
            return "Instagram_Reel";
        }

        return "Instagram_Image";
    }

    return name;
}

// ======================================
// GET ACTUAL DOWNLOAD SOURCE
// ======================================

async function getMediaSource(url) {

    const data =
        await fetchInstagram(url);


    // ----------------------------------
    // VIDEO
    // ----------------------------------

    if (
        data.type === "video" &&
        data.download_url
    ) {

        return {

    url:
        data.download_url,

    mediaType:
        "VIDEO",

    mimeType:
        "video/mp4",

    filename:
        createDownloadFilename(
            data.caption,
            "VIDEO"
        ),

    headers: {}
};
    }


    // ----------------------------------
    // IMAGE
    // ----------------------------------

    if (
        data.type === "image" &&
        data.download_url
    ) {

        return {

            url:
                data.download_url,

            mediaType:
                "IMAGE",

            mimeType:
                "image/jpeg",
                filename:
    createDownloadFilename(
        data.caption,
        "IMAGE"
    ),

            headers: {}
        };
    }


    // ----------------------------------
    // ALBUM
    // ----------------------------------

    if (
        data.type === "album" &&
        Array.isArray(data.items) &&
        data.items.length > 0
    ) {

        const firstItem =
            data.items[0];

        if (!firstItem?.download_url) {
            return null;
        }

        if (
            firstItem.type === "image"
        ) {

            return {

                url:
                    firstItem.download_url,

                mediaType:
                    "IMAGE",

                mimeType:
                    "image/jpeg",

                headers: {}
            };
        }

        return {

            url:
                firstItem.download_url,

            mediaType:
                "VIDEO",

            mimeType:
                "video/mp4",

            headers: {}
        };
    }


    return null;
}


// ======================================
// EXPORT
// ======================================

module.exports = {

    getMediaInfo,

    getMediaSource

};