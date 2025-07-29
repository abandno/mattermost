package app

import (
	"fmt"
	"runtime"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/thoas/go-funk"
)

// GetTopics 提供给 API 层，参数为 before/after/perPage
func (a *App) GetTopics(c request.CTX, opts *model.TopicPageOpts) ([]*model.TopicItem, *model.AppError) {
	orderMode := opts.OrderMode
	switch orderMode {
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

// GetTopicReplies 获取话题回复列表
func (a *App) GetTopicReplies(c request.CTX, req *model.PostRepliesReq) (result *model.TopicReplyList, appErr *model.AppError) {
	var err error
	switch {
	// 1. thread + topic + lvl1
	case req.ThreadTypes != nil && funk.Contains(*req.ThreadTypes, model.ThreadEnum) && req.Location == model.TopicEnum && req.RepLvl == 1:
		mlog.Debug("thread + topic + lvl1")
		result, err = a.Srv().Store().Topic().GetReplies4ThreadTopicLvl1(req)

	// 2. thread + topic + lvl2
	case req.ThreadTypes != nil && funk.Contains(*req.ThreadTypes, model.ThreadEnum) && req.Location == model.TopicEnum && req.RepLvl == 2:
		mlog.Debug("thread + topic + lvl2")
		result, err = a.Srv().Store().Topic().GetReplies4ThreadTopicLvl2(req)

	// 3. replythread + topic
	case req.ThreadTypes != nil && funk.Contains(*req.ThreadTypes, model.ReplyThreadEnum) && req.Location == model.TopicEnum:
		mlog.Debug("replythread + topic")
		result, err = a.Srv().Store().Topic().GetReplies4ReplyThreadTopic(req)

	// 4. replythread + comment
	case req.ThreadTypes != nil && funk.Contains(*req.ThreadTypes, model.ReplyThreadEnum) && req.Location == model.CommentEnum:
		mlog.Debug("replythread + comment")
		result, err = a.Srv().Store().Topic().GetReplies4ReplyThreadComment(req)

	default:
		return result, nil
	}

	if err != nil {
		appErr = model.NewAppError("GetTopicReplies", "app.topic.get_topic_replies.app_error", nil, "", 500).Wrap(err)
		return result, appErr
	}

	// 转换为 TopicReplyList
	return result, nil
}
