-- Add migration script here
CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    summary TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER summaries_updated_at
AFTER UPDATE ON summaries
FOR EACH ROW
BEGIN
    UPDATE summaries
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS summary_transcripts (
    id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL,
    "text" TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL,
    message TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
);

CREATE TRIGGER chats_updated_at
AFTER UPDATE ON chats
FOR EACH ROW
BEGIN
    UPDATE chats
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
END;
