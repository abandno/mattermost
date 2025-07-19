package sqlstore

import (
	"fmt"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/utils"
	"github.com/pkg/errors"
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
		case "thread":
			threadRootIds = append(threadRootIds, item.PostId)
			threadItemMap[item.PostId] = item
		case "replythread":
			replyThreadRootIds = append(replyThreadRootIds, item.PostId)
			replyThreadItemMap[item.PostId] = item
		}
	}

	// 讨论型
	if len(threadRootIds) > 0 {
		latestReplyMap := getLatestReplies(s, threadRootIds, "thread")
		for rootid, item := range threadItemMap {
			if p, ok := latestReplyMap[rootid]; ok {
				item.AttachPost = p
			}
		}
	}
	// 引用型
	if len(replyThreadRootIds) > 0 {
		latestReplyMap := getLatestReplies(s, replyThreadRootIds, "replythread")
		for rid, item := range replyThreadItemMap {
			if p, ok := latestReplyMap[rid]; ok {
				item.AttachPost = p
			}
		}
	}

	return threadsRows, err
}

// func (s *SqlTopicStore) GetTopics4Hot__DEL(opts *model.TopicPageOpts) ([]*model.TopicItem, error) {
// 	if opts == nil || opts.Limit <= 0 {
// 		opts = &model.TopicPageOpts{Limit: 10}
// 	}
// /* ey */
// 	// 查询 thread
// 	threadQuery := `
// SELECT p.*, t.replycount, t.lastreplyat, t.participants
// FROM posts p
// JOIN threads t ON p.id = t.postid
// WHERE p.deleteat = 0 AND t.replycount > 0
// ORDER BY t.replycount DESC
// LIMIT ?`

// 	// 查询 replythread
// 	replyThreadQuery := `
// SELECT p.*, t.replycount, t.lastreplyat, t.participants
// FROM posts p
// JOIN replythreads t ON p.id = t.postid
// WHERE p.deleteat = 0 AND t.replycount > 0
// ORDER BY t.replycount DESC
// LIMIT ?`

// 	topicItems := []*model.TopicItem{}

// 	type topicRow struct {
// 		model.Post
// 		ReplyCount   int64             `db:"replycount"`
// 		LastReplyAt  int64             `db:"lastreplyat"`
// 		Participants model.StringArray `db:"participants"`
// 	}

// 	// 查询 thread
// 	var threadRows []model.Thread
// 	err := s.GetReplica().Select(&threadRows, threadQuery, opts.Limit)
// 	if err != nil {
// 		return nil, err
// 	}
// 	for _, row := range threadRows {
// 		topicItems = append(topicItems, &model.TopicItem{
// 			ThreadType:   "thread",
// 			PostId:       row.PostId,
// 			ChannelId:    row.ChannelId,
// 			ReplyCount:   row.ReplyCount,
// 			LastReplyAt:  row.LastReplyAt,
// 			Participants: row.Participants,
// 			// TitlePost:    &row.Post,
// 		})
// 	}

// 	// 查询 replythread
// 	var replyThreadRows []model.Thread
// 	err = s.GetReplica().Select(&replyThreadRows, replyThreadQuery, opts.Limit)
// 	if err != nil {
// 		return nil, err
// 	}
// 	for _, row := range replyThreadRows {
// 		topicItems = append(topicItems, &model.TopicItem{
// 			ThreadType:   "replythread",
// 			PostId:       row.PostId,
// 			ChannelId:    row.ChannelId,
// 			ReplyCount:   row.ReplyCount,
// 			LastReplyAt:  row.LastReplyAt,
// 			Participants: row.Participants,
// 			// TitlePost:    &row.Post,
// 		})
// 	}

// 	// 合并后按 replycount 排序，取前 N 个
// 	if len(topicItems) > opts.Limit {
// 		sort.Slice(topicItems, func(i, j int) bool {
// 			return topicItems[i].ReplyCount > topicItems[j].ReplyCount
// 		})
// 		topicItems = topicItems[:opts.Limit]
// 	}

// 	// 关联出posts表的post, 放到 TopicItem.TitlePost
// 	postIdMap := map[string]*model.TopicItem{}
// 	postIds := []string{}
// 	for _, item := range topicItems {
// 		postIdMap[item.PostId] = item
// 		postIds = append(postIds, item.PostId)
// 	}
// 	// posts, _ := s.SqlStore.Post().GetPostsByIds(postIds)
// 	// if err == nil {
// 	// 	// for _, post := range posts {
// 	// 	// 	if item, ok := postIdMap[post.Id]; ok {
// 	// 	// 		// item.TitlePost = post // 移除无此字段的赋值
// 	// 	// 	}
// 	// 	// }
// 	// }

// 	// threads里的, posts表按rootid分组各自取到最新回复post; replythreads里的, 先在postreply按qrid分组, 取到最新回复postid, 然后关联posts取message等
// 	// 放到 AttachPost
// 	// 1. threads: rootid=PostId, posts表查最新回复
// 	threadRootIds := []string{}
// 	replyThreadRootIds := []string{}
// 	threadItemMap := map[string]*model.TopicItem{}
// 	replyThreadItemMap := map[string]*model.TopicItem{}
// 	for _, item := range topicItems {
// 		if item.ThreadType == "thread" {
// 			threadRootIds = append(threadRootIds, item.PostId)
// 			threadItemMap[item.PostId] = item
// 		} else if item.ThreadType == "replythread" {
// 			replyThreadRootIds = append(replyThreadRootIds, item.PostId)
// 			replyThreadItemMap[item.PostId] = item
// 		}
// 	}
// 	// threads: 查每个 rootid 最新回复 post
// 	if len(threadRootIds) > 0 {
// 		query := `SELECT * FROM posts WHERE rootid = ANY(?) AND deleteat = 0 AND rootid != '' AND id != rootid ORDER BY createat DESC`
// 		var replyPosts []model.Post
// 		s.GetReplica().Select(&replyPosts, query, threadRootIds)
// 		// 只保留每个 rootid 最新一条
// 		latestReplyMap := map[string]*model.Post{}
// 		for _, post := range replyPosts {
// 			if _, ok := latestReplyMap[post.RootId]; !ok {
// 				p := post
// 				latestReplyMap[post.RootId] = &p
// 			}
// 		}
// 		for rootid, item := range threadItemMap {
// 			if p, ok := latestReplyMap[rootid]; ok {
// 				item.AttachPost = p
// 			}
// 		}
// 	}
// 	// replythreads: 查每个 qrid 最新回复 postid
// 	if len(replyThreadRootIds) > 0 {
// 		// 先查 postreply 表，找 rid=PostId 的最新 postid
// 		query := `SELECT rid, postid, MAX(createat) as max_createat FROM postreply WHERE rid = ANY(?) AND deleteat = 0 GROUP BY rid`
// 		type replyInfo struct {
// 			Rid    string `db:"rid"`
// 			PostId string `db:"postid"`
// 			MaxAt  int64  `db:"max_createat"`
// 		}
// 		var replyInfos []replyInfo
// 		s.GetReplica().Select(&replyInfos, query, replyThreadRootIds)
// 		postIdToRid := map[string]string{}
// 		latestReplyPostIds := []string{}
// 		for _, info := range replyInfos {
// 			postIdToRid[info.PostId] = info.Rid
// 			latestReplyPostIds = append(latestReplyPostIds, info.PostId)
// 		}
// 		if len(latestReplyPostIds) > 0 {
// 			posts, err := s.SqlStore.Post().GetPostsByIds(latestReplyPostIds)
// 			if err == nil {
// 				for _, post := range posts {
// 					if rid, ok := postIdToRid[post.Id]; ok {
// 						if item, ok := replyThreadItemMap[rid]; ok {
// 							item.AttachPost = post
// 						}
// 					}
// 				}
// 			}
// 		}
// 	}

// 	return topicItems, nil
// }

func (s *SqlTopicStore) GetTopics4New(opts *model.TopicPageOpts) error {
	//

	return nil
}

// getLatestReplies 查询每个 rootid/rid 下最新回复 post，返回 map[rootid/rid]*model.Post
func getLatestReplies(s *SqlTopicStore, ids []string, mode string) map[string]*model.Post {
	result := map[string]*model.Post{}
	if len(ids) == 0 {
		return result
	}
	switch mode {
	case "thread":
		query := `SELECT DISTINCT ON (rootid) * FROM posts WHERE rootid = ANY(?) AND deleteat = 0 ORDER BY rootid, updateat DESC`
		var replyPosts []model.Post
		s.GetReplica().Select(&replyPosts, query, ids)
		for _, p := range replyPosts {
			result[p.RootId] = &p
		}
	case "replythread":
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
