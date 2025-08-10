package model

import "gopkg.in/guregu/null.v4"

type PostReply struct {
	PostId   string      `json:"post_id"`
	Pid      null.String `json:"pid"`
	Rid      null.String `json:"rid"`
	DRcount  null.Int    `json:"drcount"`
	CreateAt int64       `json:"create_at"`
	UpdateAt int64       `json:"update_at"`
	DeleteAt int64       `json:"delete_at"`
}
