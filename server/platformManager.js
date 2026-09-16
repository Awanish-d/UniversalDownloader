const youtube = require("./platforms/youtube");
const instagram = require("./platforms/instagram");
const pinterest = require("./platforms/pinterest");
const facebook = require("./platforms/facebook");
const tiktok = require("./platforms/tiktok");

const platforms = {
    YouTube: youtube,
    Instagram: instagram,
    Pinterest: pinterest,
    Facebook: facebook,
    TikTok: tiktok
};

function getPlatformAdapter(platform) {
    return platforms[platform] || null;
}

module.exports = {
    getPlatformAdapter
};