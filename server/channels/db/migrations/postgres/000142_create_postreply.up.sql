-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS qrid VARCHAR(26);
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS qpid VARCHAR(26);

CREATE TABLE IF NOT EXISTS postreply (
  "postid" varchar(26) COLLATE "pg_catalog"."default" NOT NULL,
  "pid" varchar(26) COLLATE "pg_catalog"."default",
  "rid" varchar(26) COLLATE "pg_catalog"."default",
  "drcount" int8 comment 'direct reply count',
  "createat" int8,
  "updateat" int8,
  "deleteat" int8,
  PRIMARY KEY ("postid")
)
;

CREATE INDEX idx_postreply_pid ON postreply("pid") WHERE deleteat = 0;
CREATE INDEX idx_postreply_rid ON postreply("rid") WHERE deleteat = 0;

-- 添加类型字段
-- ALTER TABLE threads ADD COLUMN "type" int2 DEFAULT 1;
-- 1: 讨论串 (原有), 2: 引用串 (新增)

-- 添加索引
-- CREATE INDEX idx_threads_type ON threads("type") WHERE COALESCE(threaddeleteat, 0) = 0;

CREATE TABLE replythreads (
  "postid" varchar(26) COLLATE "pg_catalog"."default" NOT NULL,
  "replycount" int8,
  "lastreplyat" int8,
  "participants" jsonb,
  "channelid" varchar(26) COLLATE "pg_catalog"."default",
  "deleteat" int8,
  "teamid" varchar(26) COLLATE "pg_catalog"."default",
  CONSTRAINT "replythreads_pkey" PRIMARY KEY ("postid")
)
;