package model

type TopicPageOpts struct {
	Before    int64
	After     int64
	Limit     int
	Direction string // first, last, prev, next
	Type      string
}
