package api4

import (
	"encoding/json"
	"net/http"
	"strconv"

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
	if perPage != "" {
		if n, err := strconv.Atoi(perPage); err == nil {
			opts.Limit = n
		}
	}
	if before != "" {
		if n, err := strconv.ParseInt(before, 10, 64); err == nil {
			opts.Before = n
		}
	}
	if after != "" {
		if n, err := strconv.ParseInt(after, 10, 64); err == nil {
			opts.After = n
		}
	}

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
	if perPage != "" {
		if n, err := strconv.Atoi(perPage); err == nil {
			opts.Limit = uint64(n)
		}
	}
	if before != "" {
		if n, err := strconv.ParseInt(before, 10, 64); err == nil {
			opts.Before = n
		}
	}
	if after != "" {
		if n, err := strconv.ParseInt(after, 10, 64); err == nil {
			opts.After = n
		}
	}

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
