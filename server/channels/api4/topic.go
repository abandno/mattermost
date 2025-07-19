package api4

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (api *API) InitTopic() {
	api.BaseRoutes.UserTopics.Handle("", api.APISessionRequired(getTopics)).Methods(http.MethodGet)
}

func getTopics(c *Context, w http.ResponseWriter, r *http.Request) {
	var (
		query     = r.URL.Query()
		before    = query.Get("before")
		after     = query.Get("after")
		perPage   = query.Get("perPage")
		direction = query.Get("direction")
		topicType      = query.Get("type")
	)

	opts := &model.TopicPageOpts{Direction: direction, Type: topicType}
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
