package model

type ThreadType string

const (
	ThreadEnum      ThreadType = "thread"
	ReplyThreadEnum ThreadType = "replythread"
)

type TopicPostLocation string

const (
	TopicEnum   TopicPostLocation = "topic"
	CommentEnum TopicPostLocation = "comment"
	ReplyEnum   TopicPostLocation = "reply"
)

// TopicPageOpts 话题分页选项
type TopicPageOpts struct {
	Before    int64  `json:"before,omitempty"`
	After     int64  `json:"after,omitempty"`
	Limit     uint64 `json:"limit,omitempty"`
	Direction string `json:"direction,omitempty"`
	OrderMode string `json:"orderMode,omitempty"`
}

// TopicReplyOpts 话题回复查询选项
type PostRepliesReq struct {
	TopicPageOpts
	PostId      string            `json:"post_id,omitempty"`
	ThreadTypes *[]ThreadType     `json:"thread_type,omitempty"`
	Pid         string            `json:"pid,omitempty"`
	Rid         string            `json:"rid,omitempty"`
	Location    TopicPostLocation `json:"location,omitempty"`
	RepLvl      int               `json:"replvl,omitempty"`
}

// PostReplyExt 话题回复
type PostReplyExt struct {
	// *Post
	*PostReply
	Level      int    `json:"level"`
	EditAt     int64  `json:"edit_at"`
	IsPinned   bool   `json:"is_pinned"`
	UserId     string `json:"user_id"`
	ChannelId  string `json:"channel_id"`
	RootId     string `json:"root_id"`
	OriginalId string `json:"original_id"`
	Message    string `json:"message"`
	// Quote reference fields
	// Pid      *string `json:"pid"` // Quote post ID - the specific post being quoted
	// Rid      *string `json:"rid"` // Quote root ID - the root post of the quoted thread
	Tid      *string `json:"tid"`
	RtId     *string `json:"rtid"`
	TrCount  *int64  `json:"trcount"`
	RtrCount *int64  `json:"rtrcount"`

	ThreadTypes []string `json:"thread_types"`
	PUserId     string   `json:"puser_id"`
}

// TopicReplyList 话题回复列表
type TopicReplyList struct {
	Replies []*PostReplyExt `json:"replies"`
	HasMore bool            `json:"has_more"`
	// HasNext bool          `json:"has_next"`
	// HasPrev bool          `json:"has_prev"`
}
