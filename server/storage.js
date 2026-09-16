const fs = require("fs");
const path = require("path");

const downloadsDir = path.join(
    __dirname,
    "downloads"
);

if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, {
        recursive: true
    });
}


// ======================================
// CLEAN DOWNLOAD FILENAME
// ======================================

function sanitizeFilename(name) {

    if (!name || typeof name !== "string") {
        return null;
    }

    let clean = name
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\.+$/, "");

    // Keep filename reasonably short
    if (clean.length > 100) {
        clean = clean.substring(0, 100).trim();
    }

    // Windows reserved names
    const reservedNames = [
        "CON",
        "PRN",
        "AUX",
        "NUL",
        "COM1",
        "COM2",
        "COM3",
        "COM4",
        "COM5",
        "COM6",
        "COM7",
        "COM8",
        "COM9",
        "LPT1",
        "LPT2",
        "LPT3",
        "LPT4",
        "LPT5",
        "LPT6",
        "LPT7",
        "LPT8",
        "LPT9"
    ];

    if (
        reservedNames.includes(
            clean.toUpperCase()
        )
    ) {
        clean = `Instagram_${clean}`;
    }

    return clean || null;
}


// ======================================
// GET FILE PATH
// ======================================

function getFilePath(
    jobId,
    extension = "bin",
    filename = null
) {

    const safeName =
        sanitizeFilename(filename);

    const finalName =
        safeName
            ? `${safeName}.${extension}`
            : `${jobId}.${extension}`;

    return path.join(
        downloadsDir,
        finalName
    );
}


// ======================================
// SAVE FILE
// ======================================

function saveFile(
    jobId,
    buffer,
    extension = "bin",
    filename = null
) {

    const filePath =
        getFilePath(
            jobId,
            extension,
            filename
        );

    fs.writeFileSync(
        filePath,
        buffer
    );

    return filePath;
}


// ======================================
// FILE EXISTS
// ======================================

function fileExists(
    jobId,
    extension = "bin"
) {

    return fs.existsSync(
        getFilePath(
            jobId,
            extension
        )
    );
}


// ======================================
// EXPORT
// ======================================

module.exports = {
    getFilePath,
    saveFile,
    fileExists
};