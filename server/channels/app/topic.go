package app

import (
	"fmt"
	"runtime"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
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
func (a *App) GetTopicReplies(c request.CTX, req *model.PostRepliesReq) (*model.TopicReplyList, *model.AppError) {
	switch {
	// 1. thread + topic + lvl1
	case req.ThreadType == model.ThreadEnum && req.Location == model.TopicEnum && req.RepLvl == 1:
		replies, err = a.Srv().Store().Post().GetPostsByThread(req.PostId, 0)
		// 转换为 TopicReply

	// 2. thread + topic + lvl2
	case req.ThreadType == model.ThreadEnum && req.Location == model.TopicEnum && req.RepLvl == 2:
		// 需要查 rid = topicId, createat > 当前话题 createat
		topic, _ := a.Srv().Store().Post().GetSingle(c, req.PostId, false)
		replies, err = a.Srv().Store().PostReply().GetAllDescendants(req.PostId)

	// 3. replythread + topic
	case req.ThreadType == model.ReplyThreadEnum && req.Location == model.TopicEnum:
		replies, err = a.Srv().Store().PostReply().GetByPid(req.PostId)

	// 4. replythread + comment
	case req.ThreadType == model.ReplyThreadEnum && req.Location == model.CommentEnum:
		replies, err = a.Srv().Store().PostReply().GetAllDescendants(req.PostId)

	default:
		return &model.TopicReplyList{Replies: []*model.PostReplyExt{}}, nil
	}

	// 转换为 TopicReplyList
	return &model.TopicReplyList{Replies: replies}, nil
}

// getThreadReplies 获取讨论串回复
func (a *App) getThreadReplies(c request.CTX, postId string, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	// 根据 postRole 判断查询层级
	switch opts.PostRole {
	case "topic":
		if opts.OrderMode == "latest" {
			// 查询话题的直接回复（lvl2）
			return a.getTopicDirectReplies(c, postId, opts)
		} else {
			// 查询话题的评论（lvl1）
			return a.getTopicComments(c, postId, opts)
		}
	case "comment":
		// 查询评论的回复
		return a.getCommentReplies(c, postId, opts)
	default:
		// 默认查询评论
		return a.getTopicComments(c, postId, opts)
	}
}

// getReplyThreadReplies 获取引用串回复
func (a *App) getReplyThreadReplies(c request.CTX, postId string, postReply *model.PostReply, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	switch opts.PostRole {
	case "topic":
		// 引用串话题，查询直接引用的
		return a.getReplyThreadTopicReplies(c, postReply.Rid, opts)
	case "comment":
		// 引用串评论，查询所有后代引用
		return a.getReplyThreadCommentReplies(c, postReply.Rid, opts)
	default:
		// 默认查询直接引用
		return a.getReplyThreadTopicReplies(c, postReply.Rid, opts)
	}
}

// getTopicComments 获取话题评论（讨论串 lvl1）
func (a *App) getTopicComments(c request.CTX, postId string, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	// 查询讨论串中的回复
	posts, err := a.Srv().Store().Post().GetPostsByThread(postId, 0)
	if err != nil {
		return nil, err
	}

	replies := make([]*model.PostReplyExt, 0, len(posts))
	for _, post := range posts {
		replies = append(replies, &model.PostReplyExt{
			Post: post,
		})
	}

	return replies, nil
}

// getTopicDirectReplies 获取话题直接回复（讨论串 lvl2）
func (a *App) getTopicDirectReplies(c request.CTX, postId string, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	// 查询引用串中，当前话题时间之后的引用
	// 这里需要根据实际需求实现
	// 暂时返回空列表
	return []*model.PostReplyExt{}, nil
}

// getCommentReplies 获取评论回复
func (a *App) getCommentReplies(c request.CTX, postId string, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	// 查询评论的回复
	// 这里需要根据实际需求实现
	// 暂时返回空列表
	return []*model.PostReplyExt{}, nil
}

// getReplyThreadTopicReplies 获取引用串话题回复
func (a *App) getReplyThreadTopicReplies(c request.CTX, rid string, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	// 查询引用串中直接引用的
	// 这里需要根据实际需求实现
	// 暂时返回空列表
	return []*model.PostReplyExt{}, nil
}

// getReplyThreadCommentReplies 获取引用串评论回复
func (a *App) getReplyThreadCommentReplies(c request.CTX, rid string, opts *model.TopicReplyOpts) ([]*model.PostReplyExt, error) {
	// 查询引用串中所有后代引用
	// 这里需要根据实际需求实现
	// 暂时返回空列表
	return []*model.PostReplyExt{}, nil
}
