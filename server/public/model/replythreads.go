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
