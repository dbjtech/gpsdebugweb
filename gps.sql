BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS gps(
       mobile VARCHAR(20) NOT NULL,
       lat REAL NOT NULL,
       lon REAL NOT NULL,
       timestamp TEXT NOT NULL);

CREATE INDEX gps_mobile_idx ON gps(mobile);

CREATE INDEX gps_timestamp_idx ON gps(timestamp);
COMMIT;
