package api4

import (
	"encoding/json"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/utils"
)

func (api *API) InitTopic() {
	api.BaseRoutes.UserTopics.Handle("", api.APISessionRequired(getTopics)).Methods(http.MethodGet)
	api.BaseRoutes.UserTopicReplies.Handle("", api.APISessionRequired(getTopicReplies)).Methods(http.MethodGet)
}

func getTopics(c *Context, w http.ResponseWriter, r *http.Request) {
	var (
		query     = r.URL.Query()
		before    = query.Get("before")
		after     = query.Get("after")
		perPage   = query.Get("per_page")
		direction = query.Get("direction")
		orderMode = query.Get("order_mode")
	)

	opts := &model.TopicPageOpts{Direction: direction, OrderMode: orderMode}
	if opts.Direction == "" {
		opts.Direction = "first"
	}
	opts.Limit = utils.ToUInt64(perPage, 10)
	opts.Before = utils.ToInt64(before, 0)
	opts.After = utils.ToInt64(after, 0)

	topics, err := c.App.GetTopics(c.AppContext, opts)
	if err != nil {
		c.Err = err
		return
	}
	if err := json.NewEncoder(w).Encode(topics); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
	}
}

func getTopicReplies(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	var (
		query      = r.URL.Query()
		before     = query.Get("before")
		after      = query.Get("after")
		perPage    = query.Get("per_page")
		direction  = query.Get("direction")
		orderMode  = query.Get("order_mode")
		pid        = query.Get("pid")
		rid        = query.Get("rid")
		topicId    = query.Get("topic_id")
		location   = query.Get("location")
		threadType = query.Get("thread_type")
		replvl     = query.Get("replvl")
	)

	opts := &model.TopicPageOpts{Direction: direction, OrderMode: orderMode}
	if opts.Direction == "" {
		opts.Direction = "first"
	}
	opts.Limit = utils.ToUInt64(perPage, 10)
	opts.Before = utils.ToInt64(before, 0)
	opts.After = utils.ToInt64(after, 0)

	req := &model.PostRepliesReq{
		TopicPageOpts: *opts,
		Location:      model.TopicPostLocation(location),
		Pid:           pid,
		Rid:           rid,
		PostId:        topicId,
		ThreadType:    model.ThreadType(threadType),
		RepLvl:        utils.ToInt(replvl, 1),
	}

	replies, err := c.App.GetTopicReplies(c.AppContext, req)
	if err != nil {
		c.Err = err
		return
	}
	if err := json.NewEncoder(w).Encode(replies); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
	}
}
