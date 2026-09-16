const FASTSAVER_ENDPOINT =
    "https://api.fastsaver.io/v1/fetch";


// ======================================
// FASTSAVER PINTEREST REQUEST
// ======================================

async function fetchPinterest(url) {

    const apiKey =
        process.env.FASTSAVER_API_KEY;

    if (!apiKey) {
        throw new Error(
            "FastSaver API key is not configured."
        );
    }

    const endpoint =
        `${FASTSAVER_ENDPOINT}?url=${encodeURIComponent(url)}`;

    const response =
        await fetch(
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

    console.log(
        "PINTEREST FASTSAVER RESPONSE:",
        JSON.stringify(data, null, 2)
    );

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            "FastSaver Pinterest request failed."
        );
    }

    if (!data?.ok) {
        throw new Error(
            data?.message ||
            "FastSaver could not process this Pinterest URL."
        );
    }

    return data;
}


// ======================================
// CREATE DOWNLOAD FILENAME
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
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ""
        )
        .trim();

    if (name.length > 100) {
        name =
            name.substring(0, 100).trim();
    }

    if (!name) {

        return mediaType === "VIDEO"
            ? "Pinterest_Video"
            : "Pinterest_Image";
    }

    return name;
}


// ======================================
// ANALYZE PINTEREST URL
// ======================================

async function getMediaInfo(url) {

    try {

        const data =
            await fetchPinterest(url);

        const mediaItems = [];


        // ==================================
        // ALBUM / MULTIPLE ITEMS
        // ==================================

        if (
            data.type === "album" &&
            Array.isArray(data.items)
        ) {

            data.items.forEach(
                (item) => {
                    console.log(
    "PINTEREST ALBUM ITEM:",
    JSON.stringify(item, null, 2)
);

                    if (
                        !item ||
                        !item.download_url
                    ) {
                        return;
                    }

                    const isVideo =
                        String(
                            item.type || ""
                        ).toLowerCase() ===
                        "video";

                    mediaItems.push({

                        type:
                            isVideo
                                ? "video"
                                : "image",

                        url:
                            item.download_url,

                        thumbnailUrl:
                            item.thumbnail_url ||
                            item.download_url,

                        quality:
                            isVideo
                                ? "Video"
                                : "Image",

                        mimeType:
                            isVideo
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
            );
        }


        // ==================================
        // SINGLE VIDEO
        // ==================================

        else if (
            data.type === "video" &&
            data.download_url
        ) {

            mediaItems.push({

                type:
                    "video",

                url:
                    data.download_url,

                thumbnailUrl:
                    data.thumbnail_url ||
                    null,

                quality:
                    "Video",

                mimeType:
                    "video/mp4",

                width:
                    data.width || 0,

                height:
                    data.height || 0,

                duration:
                    data.duration || 0

            });
        }


        // ==================================
        // SINGLE IMAGE
        // ==================================

        else if (
            data.type === "image" &&
            data.download_url
        ) {

            mediaItems.push({

                type:
                    "image",

                url:
                    data.download_url,

                thumbnailUrl:
                    data.thumbnail_url ||
                    data.download_url,

                quality:
                    "Image",

                mimeType:
                    "image/jpeg",

                width:
                    data.width || 0,

                height:
                    data.height || 0

            });
        }


        return {

            platform:
                "Pinterest",

            url:
                url,

            supported:
                true,

            type:
                "platform",

            downloadAvailable:
                mediaItems.length > 0,

            previewOnly:
                false,

            title:
                data.caption ||
                "Pinterest media",

            authorName:
                "",

            thumbnailUrl:
                data.thumbnail_url ||
                (
                    mediaItems[0]
                        ? mediaItems[0].thumbnailUrl
                        : null
                ),

            duration:
                data.duration ||
                0,

            mediaItems:
                mediaItems,

            mediaCount:
                mediaItems.length,

            watchUrl:
                url,

            message:
                mediaItems.length > 0
                    ? "Pinterest media detected successfully."
                    : "Pinterest media was not returned."

        };

    } catch (error) {

        console.error(
            "FastSaver Pinterest analyze error:",
            error.message
        );

        return {

            platform:
                "Pinterest",

            url:
                url,

            supported:
                true,

            type:
                "platform",

            downloadAvailable:
                false,

            previewOnly:
                true,

            mediaItems:
                [],

            mediaCount:
                0,

            message:
                error.message ||
                "Unable to analyze this Pinterest URL."

        };
    }
}


// ======================================
// GET ACTUAL DOWNLOAD SOURCE
// ======================================

async function getMediaSource(url) {

    const data =
        await fetchPinterest(url);


    // ==================================
    // SINGLE VIDEO
    // ==================================

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


    // ==================================
    // SINGLE IMAGE
    // ==================================

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


    // ==================================
    // ALBUM
    // ==================================

    if (
        data.type === "album" &&
        Array.isArray(data.items) &&
        data.items.length > 0
    ) {

        const firstItem =
            data.items[0];

        if (
            !firstItem ||
            !firstItem.download_url
        ) {
            return null;
        }

        const isVideo =
            String(
                firstItem.type || ""
            ).toLowerCase() ===
            "video";

        return {

            url:
                firstItem.download_url,

            mediaType:
                isVideo
                    ? "VIDEO"
                    : "IMAGE",

            mimeType:
                isVideo
                    ? "video/mp4"
                    : "image/jpeg",

            filename:
                createDownloadFilename(
                    data.caption,
                    isVideo
                        ? "VIDEO"
                        : "IMAGE"
                ) + "_1",

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