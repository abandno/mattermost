package sqlstore

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

type SqlPostReplyStore struct {
	*SqlStore
}

func newSqlPostReplyStore(sqlStore *SqlStore) store.PostReplyStore {
	return &SqlPostReplyStore{sqlStore}
}

func (s *SqlPostReplyStore) Save(reply *model.PostReply) error {
	_, err := s.GetMaster().Exec(`
		INSERT INTO postreply (postid, pid, rid, drcount, createat, updateat, deleteat)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (postid) DO UPDATE SET
			pid = EXCLUDED.pid,
			rid = EXCLUDED.rid,
			drcount = EXCLUDED.drcount,
			updateat = EXCLUDED.updateat
	`, reply.PostId, reply.Pid, reply.Rid, reply.DRcount, reply.CreateAt, reply.UpdateAt, reply.DeleteAt)
	return err
}

func (s *SqlPostReplyStore) GetByPostId(postId string) (*model.PostReply, error) {
	var reply model.PostReply
	err := s.GetReplica().Get(&reply, `
		SELECT postid, pid, rid, drcount, createat, updateat, deleteat
		FROM postreply
		WHERE postid = $1 AND deleteat = 0
	`, postId)
	if err != nil {
		return nil, err
	}
	return &reply, nil
}

func (s *SqlPostReplyStore) IncrDRcountByPostId(postId string) error {
	_, err := s.GetMaster().Exec(`
		UPDATE postreply SET drcount = drcount + 1, updateat = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE postid = $1
	`, postId)
	return err
}
