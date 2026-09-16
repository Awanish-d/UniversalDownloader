const db = require("./database");

function createJob(data = {}) {
    const id =
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8);

    const now = new Date().toISOString();

    const job = {
        id: id,
        url: data.url,
        status: "queued",
        progress: 0,
        message: null,
        filePath: null,
        createdAt: now,
        updatedAt: now
    };

    const statement = db.prepare(`
        INSERT INTO jobs (
            id,
            url,
            status,
            progress,
            message,
            file_path,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
        job.id,
        job.url,
        job.status,
        job.progress,
        job.message,
        job.filePath,
        job.createdAt,
        job.updatedAt
    );

    return job;
}

function rowToJob(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        url: row.url,
        status: row.status,
        progress: row.progress,
        message: row.message,
        filePath: row.file_path || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getJob(id) {
    const statement = db.prepare(`
        SELECT *
        FROM jobs
        WHERE id = ?
    `);

    const row = statement.get(id);

    return rowToJob(row);
}

function updateJob(id, updates) {
    const existingJob = getJob(id);

    if (!existingJob) {
        return null;
    }

    const updatedJob = {
        ...existingJob,
        ...updates,
        updatedAt: new Date().toISOString()
    };

    const statement = db.prepare(`
        UPDATE jobs
        SET
            url = ?,
            status = ?,
            progress = ?,
            message = ?,
            file_path = ?,
            updated_at = ?
        WHERE id = ?
    `);

    statement.run(
        updatedJob.url,
        updatedJob.status,
        updatedJob.progress,
        updatedJob.message,
        updatedJob.filePath,
        updatedJob.updatedAt,
        id
    );

    return updatedJob;
}

function getAllJobs() {
    const statement = db.prepare(`
        SELECT *
        FROM jobs
        ORDER BY created_at DESC
    `);

    const rows = statement.all();

    return rows.map(rowToJob);
}

module.exports = {
    createJob,
    getJob,
    updateJob,
    getAllJobs
};