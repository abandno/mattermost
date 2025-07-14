package model

type PostReply struct {
	PostId   string `json:"post_id"`
	Pid      string `json:"pid"`
	Rid      string `json:"rid"`
	DRcount  int64  `json:"drcount"`
	CreateAt int64  `json:"create_at"`
	UpdateAt int64  `json:"update_at"`
	DeleteAt int64  `json:"delete_at"`
}
