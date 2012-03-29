BEGIN TRANSACTION;
CREATE TABLE gps(
       mobile VARCHAR(20) NOT NULL,
       lon REAL NOT NULL,
       lat REAL NOT NULL,
       timestamp INTEGER NOT NULL);

CREATE INDEX gps_mobile_idx ON gps(mobile);

CREATE INDEX gps_timestamp_idx ON gps(timestamp);
COMMIT;