function getMediaInfo(url) {
    return {
        platform: "Facebook",
        url,
        supported: false,
        type: "platform",
        downloadAvailable: false,
        message:
            "Facebook link detected. Media download requires an authorized/available media source."
    };
}

async function getMediaSource(url) {
    return null;
}

module.exports = {
    getMediaInfo,
    getMediaSource
};