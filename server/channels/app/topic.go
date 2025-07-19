package app

import (
	"fmt"
	"runtime"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

// GetTopics 提供给 API 层，参数为 before/after/perPage
func (a *App) GetTopics(c request.CTX, opts *model.TopicPageOpts) ([]*model.TopicItem, *model.AppError) {
	topicType := opts.Type
	switch topicType {
	case "hot":
		return a.GetTopics4Hot(opts)
	default:
		return []*model.TopicItem{}, model.NewAppError("GetTopics", "app.topic.get_topics.app_error", nil, "The topic type that are not supported yet", 500)
	}
}

func (a *App) GetTopics4Hot(opts *model.TopicPageOpts) ([]*model.TopicItem, *model.AppError) {
	// 获取调用栈信息
	_, file, line, _ := runtime.Caller(0)

	topics, err := a.Srv().Store().Topic().GetTopics4Hot(opts)
	if err != nil {
		// 构建详细的错误信息
		detailedError := fmt.Sprintf("GetTopics4Hot failed at %s:%d, opts: %+v, error: %v", file, line, opts, err)
		return nil, model.NewAppError("GetTopics4Hot", "app.topic.get_topics4hot.app_error", nil, detailedError, 500).Wrap(err)
	}
	return topics, nil
}
