package sqlstore

import (
	"fmt"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/utils"
	sq "github.com/mattermost/squirrel"
	"github.com/pkg/errors"
	"github.com/thoas/go-funk"
)

type SqlTopicStore struct {
	*SqlStore
}

func newSqlTopicStore(sqlStore *SqlStore) store.TopicStore {
	return &SqlTopicStore{sqlStore}
}

func (s *SqlTopicStore) GetTopics4Hot(opts *model.TopicPageOpts) ([]*model.TopicItem, error) {
	if s.DriverName() == model.DatabaseDriverMysql {
		return nil, errors.New("MySQL is not supported yet")
	}
	if opts == nil || opts.Limit <= 0 {
		opts = &model.TopicPageOpts{Limit: 10}
	}

	/*
		下一页(next): 按 replycount 降序, 且小于 After (非空非0), 取前 N 个
		上一页(prev): 按 replycount 升序, 且大于 Before (非空非0), 取前 N 个, 最后返回的结果要翻转下
		第一页(first): 按 replycount 降序, 取前 N 个
		最后一页(last): 按 replycount 升序, 取前 N 个, 最后返回的结果要翻转下
		下一页如果没有了, 降级返回最后一页; 上一页如果没有了, 降级返回第一页. 即在有数据的情况下, 避免返回给用空list
	*/

	// 两种threads一起排序取top, 然后关联出posts
	deleteatCond4Thread := "COALESCE(threaddeleteat, 0) = 0 "
	deleteatCond4ReplyThread := "deleteat = 0"
	where := ""
	order := "replycount DESC"
	limit := opts.Limit
	if limit <= 0 {
		limit = 10
	}
	switch opts.Direction {
	case "next":
		if opts.After > 0 {
			where += fmt.Sprintf(" AND replycount < %d", opts.After)
		}
		order = "replycount DESC"
	case "prev":
		if opts.Before > 0 {
			where += fmt.Sprintf(" AND replycount > %d", opts.Before)
		}
		order = "replycount ASC"
	case "last":
		order = "replycount ASC"
	case "first", "":
		order = "replycount DESC"
	}

	// 2. 组装 SQL
	threadQuery, err := utils.StrFormat(
		"threadQuery",
		`SELECT * FROM 
		(
			SELECT *
			FROM (
				(
					SELECT postid, replycount, lastreplyat, participants, 'thread' as thread_type 
					FROM threads 
					WHERE {{.DeleteatCond4Thread}} {{.Where}}
					ORDER BY {{.Order}}
					LIMIT {{.Limit}}
				)
				UNION ALL
				(
					SELECT postid, replycount, lastreplyat, participants, 'replythread' as thread_type 
					FROM replythreads 
					WHERE {{.DeleteatCond4ReplyThread}} {{.Where}}
					ORDER BY {{.Order}}
					LIMIT {{.Limit}}
				)
			) AS combined_threads
			ORDER BY combined_threads.replycount DESC
			LIMIT {{.Limit}}
		) as final_threads
		JOIN posts on final_threads.postid = posts.id`,
		map[string]any{"Where": where, "Order": order, "Limit": limit,
			"DeleteatCond4Thread":      deleteatCond4Thread,
			"DeleteatCond4ReplyThread": deleteatCond4ReplyThread})
	mlog.Debug("GetTopics4Hot threadQuery : \n" + threadQuery)
	if err != nil {
		return nil, err
	}

	threadsRows := []*model.TopicItem{}
	err = s.GetReplica().Select(&threadsRows, threadQuery)
	if err != nil {
		return nil, err
	}

	// AttachPost 处理, 暂是帖子的最新回复
	// threads里的, posts表按rootid分组各自取到最新回复post; replythreads里的, 先在postreply按qrid分组, 取到最新回复postid, 然后关联posts取message等
	// 放到 AttachPost

	// 分离出不同类型的postid
	threadRootIds := []string{}
	replyThreadRootIds := []string{}
	threadItemMap := map[string]*model.TopicItem{}
	replyThreadItemMap := map[string]*model.TopicItem{}
	for _, item := range threadsRows {
		switch item.ThreadType {
		case model.ThreadEnum:
			threadRootIds = append(threadRootIds, item.PostId)
			threadItemMap[item.PostId] = item
		case model.ReplyThreadEnum:
			replyThreadRootIds = append(replyThreadRootIds, item.PostId)
			replyThreadItemMap[item.PostId] = item
		}
	}

	// 讨论型
	if len(threadRootIds) > 0 {
		latestReplyMap := getLatestReplies(s, threadRootIds, model.ThreadEnum)
		for rootid, item := range threadItemMap {
			if p, ok := latestReplyMap[rootid]; ok {
				item.AttachPost = p
			}
		}
	}
	// 引用型
	if len(replyThreadRootIds) > 0 {
		latestReplyMap := getLatestReplies(s, replyThreadRootIds, model.ReplyThreadEnum)
		for rid, item := range replyThreadItemMap {
			if p, ok := latestReplyMap[rid]; ok {
				item.AttachPost = p
			}
		}
	}

	if opts.Direction == "prev" || opts.Direction == "last" {
		// 翻转 threadsRows
		threadsRows = funk.Reverse(threadsRows).([]*model.TopicItem)
	}

	return threadsRows, err
}

func (s *SqlTopicStore) GetTopics4New(opts *model.TopicPageOpts) error {
	//

	return nil
}

// getLatestReplies 查询每个 rootid/rid 下最新回复 post，返回 map[rootid/rid]*model.Post
func getLatestReplies(s *SqlTopicStore, ids []string, mode model.ThreadType) map[string]*model.Post {
	result := map[string]*model.Post{}
	if len(ids) == 0 {
		return result
	}
	switch mode {
	case model.ThreadEnum:
		query := `SELECT DISTINCT ON (rootid) * FROM posts WHERE rootid = ANY(?) AND deleteat = 0 ORDER BY rootid, updateat DESC`
		var replyPosts []model.Post
		s.GetReplica().Select(&replyPosts, query, ids)
		for _, p := range replyPosts {
			result[p.RootId] = &p
		}
	case model.ReplyThreadEnum:
		type replyPost struct {
			model.Post
			Rid string
			Pid string
		}
		query := `
			SELECT t2.*, t1.rid, t1.pid FROM (
				SELECT DISTINCT ON (rid) postid, rid, pid
				FROM postreply
				WHERE rid = ANY(?) AND deleteat = 0
				ORDER BY rid, updateat DESC
			) t1
			JOIN posts t2 ON t1.postid = t2.id
		`
		var replyPosts []replyPost
		s.GetReplica().Select(&replyPosts, query, ids)
		for _, p := range replyPosts {
			result[p.Rid] = &p.Post
		}
	}
	return result
}

// thread + topic + lvl1（评论列表，讨论串里找）
func (s *SqlTopicStore) GetReplies4ThreadTopicLvl1(req *model.PostRepliesReq) (*model.TopicReplyList, error) {
	query := s.getQueryBuilder().
		Select("p.id PostId, p.message Message, p.userid UserId, p.createat CreateAt, p.updateat UpdateAt").
		From("Posts p").
		Where(sq.Eq{"RootId": req.PostId}).
		Where(sq.Eq{"DeleteAt": 0}).
		Limit(req.Limit)

	switch req.Direction {
	case "next":
		if req.After > 0 {
			query.Where(sq.Lt{"updateat": req.After})
		}
		query.OrderBy("updateat DESC")
	case "prev":
		if req.Before > 0 {
			query.Where(sq.Gt{"updateat": req.Before})
		}
		query.OrderBy("updateat ASC")
	case "last":
		query.OrderBy("updateat ASC")
	case "first":
		query.OrderBy("updateat DESC")
	default:
		// 暂仅支持向后加载更多
		return nil, errors.New("invalid direction")
	}

	sql, args, err := query.ToSql()
	mlog.Debug("SqlTopicStore.GetReplies4ThreadTopicLvl1", mlog.String("sql", sql), mlog.Any("args", args))
	if err != nil {
		return nil, errors.Wrap(err, "Get_Tosql")
	}

	replies := []*model.PostReplyExt{}
	err = s.GetReplica().Select(&replies, sql, args...)
	if err != nil {
		mlog.Error("", mlog.Err(err))
	}

	if req.Direction == "prev" || req.Direction == "last" {
		// 翻转
		replies = funk.Reverse(replies).([]*model.PostReplyExt)
	}

	result := &model.TopicReplyList{
		Replies: replies,
		HasMore: len(replies) >= int(req.Limit), // 当前页满了, 可能还有
	}

	return result, err
}

// thread + topic + lvl2（话题直接回复，引用串中找，所有后代）
func (s *SqlTopicStore) GetReplies4ThreadTopicLvl2(req *model.PostRepliesReq) (*model.TopicReplyList, error) {
	return s.GetReplies4ReplyThreadComment(req)
}

// replythread + topic（引用串，直接引用）
func (s *SqlTopicStore) GetReplies4ReplyThreadTopic(req *model.PostRepliesReq) (*model.TopicReplyList, error) {
	// 1. 子查询：查 postreply
	subQuery := sq.
		Select("*").
		From("postreply").
		// OrderBy("updateat DESC").
		Where(sq.Eq{"pid": req.PostId}).
		Where(sq.NotEq{"postid": req.PostId}).
		Limit(req.Limit)

	switch req.Direction {
	case "next":
		if req.After > 0 {
			subQuery.Where(sq.Lt{"updateat": req.After})
		}
		subQuery.OrderBy("updateat DESC")
	case "prev":
		if req.Before > 0 {
			subQuery.Where(sq.Gt{"updateat": req.Before})
		}
		subQuery.OrderBy("updateat ASC")
	case "last":
		subQuery.OrderBy("updateat ASC")
	case "first":
		subQuery.OrderBy("updateat DESC")
	default:
		// 暂仅支持向后加载更多
		return nil, errors.New("invalid direction")
	}

	// 2. 主查询：join posts
	query := sq.
		Select(`pr.pid Pid, pr.rid Rid, p.id PostId, p.message Message, p.userid UserId, p.channelid ChannelId, 
		p.createat CreateAt, p.updateat UpdateAt, p.editat EditAt, p.rootid RootId, p.originalid OriginalId`).
		FromSelect(subQuery, "pr").
		Join("posts p ON p.id = pr.postid").
		OrderBy("p.updateat DESC")

	sqlStr, args, err := query.ToSql()
	mlog.Debug("SqlTopicStore.GetReplies4ReplyThreadTopic", mlog.String("sql", sqlStr), mlog.Any("args", args))
	if err != nil {
		return nil, err
	}

	posts := []*model.PostReplyExt{}
	err = s.GetReplica().Select(&posts, sqlStr, args...)
	if err != nil {
		mlog.Error("", mlog.Err(err))
		return nil, err
	}

	if req.Direction == "prev" || req.Direction == "last" {
		// 翻转
		posts = funk.Reverse(posts).([]*model.PostReplyExt)
	}

	return &model.TopicReplyList{Replies: posts, HasMore: len(posts) >= int(req.Limit)}, nil
}

// replythread + comment（引用串，所有后代）
func (s *SqlTopicStore) GetReplies4ReplyThreadComment(req *model.PostRepliesReq) (*model.TopicReplyList, error) {
	replies, err := s.queryDescendantReply(req)
	if err != nil {
		return &model.TopicReplyList{}, err
	}
	if len(replies) == 0 {
		return &model.TopicReplyList{Replies: []*model.PostReplyExt{}}, nil
	}

	// 递归查回复链，实际post页面上懒加载，当前进返回回复关系链，用于翻页
	// 前 10 条，现在就关联出posts
	err = s.fillPosts4FirstPage(req, replies)
	if err != nil {
		return &model.TopicReplyList{Replies: []*model.PostReplyExt{}}, err
	}

	var hasMore = false
	if len(replies) >= int(req.Limit) {
		hasMore = true
	}
	return &model.TopicReplyList{Replies: replies, HasMore: hasMore}, nil
}

func (s *SqlTopicStore) fillPosts4FirstPage(req *model.PostRepliesReq, replies []*model.PostReplyExt) error {
	postids := make([]string, 0, int(req.Limit))
	pids := make([]string, 0, int(req.Limit))
	for _, r := range replies {
		postids = append(postids, r.PostId)
		if r.Pid != nil && r.Pid != r.Rid {
			pids = append(pids, *r.Pid)
		}
		if len(postids) >= int(req.Limit) {
			break
		}
	}

	// 被回复userId
	parentPostUsersChan := make(chan map[string]*model.Post, 1)
	go func() {
		if len(pids) == 0 {
			parentPostUsersChan <- map[string]*model.Post{}
			return
		}
		query, args, err := sq.Select("Id, UserId").From("posts").Where(sq.Eq{"id": pids}).ToSql()
		if err != nil {
			mlog.Error("", mlog.Err(err))
			parentPostUsersChan <- map[string]*model.Post{}
			return
		}
		posts := []*model.Post{}
		err = s.GetReplica().Select(&posts, query, args...)
		if err != nil {
			mlog.Error("", mlog.Err(err))
			parentPostUsersChan <- map[string]*model.Post{}
		}

		m := funk.ToMap(posts, "Id")
		parentPostUsersChan <- m.(map[string]*model.Post)
		close(parentPostUsersChan)
	}()

	// 批量查 posts
	posts := []*model.Post{}
	query, args, err := sq.Select("*").From("posts").Where(sq.Eq{"id": postids}).ToSql()
	if err != nil {
		return errors.Wrap(err, "GetPosts_Tosql")
	}
	err = s.GetReplica().Select(&posts, query, args...)
	if err != nil {
		return errors.Wrap(err, "GetPosts_Select")
	}
	postMap := make(map[string]*model.Post, len(posts))
	for _, p := range posts {
		postMap[p.Id] = p
	}

	parentPostMap := <-parentPostUsersChan

	// 5. 组装返回
	for _, r := range replies {
		if post, ok := postMap[r.PostId]; ok {
			r.Message = post.Message
			r.UserId = post.UserId
			r.ChannelId = post.ChannelId
		}
		if ppost, ok := parentPostMap[r.PostId]; ok {
			r.PUserId = ppost.UserId
		}
	}
	return nil
}

// 递归查询所有后代回复链
func (s *SqlTopicStore) queryDescendantReply(req *model.PostRepliesReq) ([]*model.PostReplyExt, error) {
	const maxlimit = 1000
	const maxrec = 6
	sql, args, err := sq.
		Select("*").
		Prefix(`
        WITH RECURSIVE descendants AS (
            SELECT *, 1 AS Level 
            FROM postreply 
            WHERE pid = $1 AND deleteat = 0 AND postid <> pid
            UNION ALL
            SELECT pr.*, d.Level + 1
            FROM postreply pr
            INNER JOIN descendants d ON pr.pid = d.postid
            WHERE pr.deleteat = 0 AND d.level <= $2
        )
    `, req.PostId, maxrec).
		From("descendants").
		OrderBy("updateat ASC").
		Limit(uint64(maxlimit)).
		ToSql()
	mlog.Debug("SqlTopicStore.GetReplies4ReplyThreadComment", mlog.String("sql", sql), mlog.Any("args", args))
	if err != nil {
		mlog.Error("", mlog.Err(err))
		return nil, errors.Wrap(err, "Get_Tosql")
	}
	replies := []*model.PostReplyExt{}
	err = s.GetReplica().Select(&replies, sql, args...)
	if err != nil {
		mlog.Error("", mlog.Err(err))
		return nil, err
	}
	return replies, nil
}
