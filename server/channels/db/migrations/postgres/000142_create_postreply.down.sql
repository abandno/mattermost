-- ALTER TABLE posts DROP COLUMN IF EXISTS qrid;
-- ALTER TABLE posts DROP COLUMN IF EXISTS qpid;

-- DROP INDEX IF EXISTS idx_threads_type;
-- ALTER TABLE threads DROP COLUMN IF EXISTS type;

-- DROP INDEX IF EXISTS idx_postreply_rid;
-- DROP INDEX IF EXISTS idx_postreply_pid;
DROP TABLE IF EXISTS postreply;
DROP TABLE IF EXISTS replythreads;