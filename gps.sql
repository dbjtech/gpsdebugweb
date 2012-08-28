BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS gps(
       mobile VARCHAR(20) NOT NULL,
       lat REAL NOT NULL,
       lon REAL NOT NULL,
       alt REAL DEFAULT 0,
       std_lat REAL DEFAULT 0,
       std_lon REAL DEFAULT 0,
       std_alt REAL DEFAULT 0,
       range_rms REAL DEFAULT 0,
       -- report local time
       timestamp TEXT NOT NULL,
       -- satellites' info
       satellites TEXT DEFAULT NULL,
       -- for temorary flexibility
       misc TEXT DEFAULT NULL);

CREATE INDEX gps_mobile_idx ON gps(mobile);

CREATE INDEX gps_timestamp_idx ON gps(timestamp);
COMMIT;
