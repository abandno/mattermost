package sqlstore

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

type SqlReplyThreadsStore struct {
	*SqlStore
}

func newSqlReplyThreadsStore(sqlStore *SqlStore) store.ReplyThreadsStore {
	return &SqlReplyThreadsStore{sqlStore}
}

func (s *SqlReplyThreadsStore) Save(thread *model.ReplyThreads) error {
	_, err := s.GetMaster().Exec(`
		INSERT INTO replythreads (postid, channelid, replycount, lastreplyat, participants, deleteat, teamid)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (postid) DO UPDATE SET
			replycount = EXCLUDED.replycount,
			lastreplyat = EXCLUDED.lastreplyat,
			participants = EXCLUDED.participants,
			deleteat = EXCLUDED.deleteat,
			teamid = EXCLUDED.teamid
	`, thread.PostId, thread.ChannelId, thread.ReplyCount, thread.LastReplyAt, thread.Participants, thread.DeleteAt, thread.TeamId)
	return err
}

func (s *SqlReplyThreadsStore) IncrReplyCountByPostId(postId string) error {
	_, err := s.GetMaster().Exec(`
		UPDATE replythreads SET replycount = replycount + 1, lastreplyat = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE postid = $1
	`, postId)
	return err
}
