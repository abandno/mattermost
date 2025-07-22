package model

type ReplyThreads struct {
	PostId       string      `json:"post_id"`
	ReplyCount   int64       `json:"reply_count"`
	LastReplyAt  int64       `json:"last_reply_at"`
	Participants StringArray `json:"participants"`
	ChannelId    string      `json:"channel_id"`
	DeleteAt     int64       `json:"delete_at"`
	TeamId       string      `json:"team_id"`
}

// 获取最热/最新话题（串+引用串），返回带首帖和最新回复的结构体
// type TopicItem struct {
// 	Type         string // "thread" or "replythread"
// 	PostId       string
// 	ChannelId    string
// 	ReplyCount   int64
// 	LastReplyAt  int64
// 	Participants []string
// 	TitlePost    *Post // 首帖
// 	AttachPost   *Post // 最新回复 或 最热, 后续按需选择
// }

type TopicItem struct {
	Post
	ThreadType   ThreadType  `db:"thread_type" json:"thread_type"` // "thread" or "replythread"
	PostId       string      `json:"post_id"`
	ChannelId    string      `json:"channel_id"`
	ReplyCount   int64       `json:"reply_count"`
	LastReplyAt  int64       `json:"last_reply_at"`
	Participants StringArray `json:"participants"`
	// TitlePost    *Post // 首帖
	AttachPost *Post `json:"attach_post"` // 最新回复 或 最热, 后续按需选择
}
