require("dotenv").config();

const config = {
    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY || null
    },

    instagram: {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || null
    },

    facebook: {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN || null
    },

    pinterest: {
        accessToken: process.env.PINTEREST_ACCESS_TOKEN || null
    },

    tiktok: {
        accessToken: process.env.TIKTOK_ACCESS_TOKEN || null
    }
};

module.exports = config;