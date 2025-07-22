// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getCurrentTeamId } from 'mattermost-redux/selectors/entities/teams';
import { getCurrentUserId } from 'mattermost-redux/selectors/entities/users';
import { getPost } from 'mattermost-redux/actions/posts';
import { Client4 } from 'mattermost-redux/client';
import { selectLhsItem } from 'actions/views/lhs';
import { LhsItemType, LhsPage } from 'types/store/lhs';

import LoadingScreen from 'components/loading_screen';
import { useMd2PlainText } from 'hooks/useMd2PlainText';
import { formatTime } from 'utils/datetime';
import { CommentTree, CommentNode } from './model';
import type { GlobalState } from 'types/store';

import './topic_detail.scss';
import { Post } from '@mattermost/types/posts';

const TopicDetail = () => {
    const dispatch = useDispatch();
    const { team, topicId } = useParams<{ team: string; topicId: string }>();
    const currentTeamId = useSelector(getCurrentTeamId);
    const currentUserId = useSelector(getCurrentUserId);

    const [isLoading, setIsLoading] = useState(true);
    const [topic, setTopic] = useState<Post | null>(null);
    const [quotedPost, setQuotedPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Post[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [rollPageOpts, setRollPageOpts] = useState<[number, number, string]>([0, 0, 'first'])
    const [topicDirectReplyTree, setTopicDirectReplyTree] = useState<CommentTree>(new CommentTree(topicId, 'topic-reply', (data: any) => data.updateat));
    const [topicCommentTree, setTopicCommentTree] = useState<CommentTree>(new CommentTree(topicId, 'topic', (data: any) => data.updateat));
    const threadType = topic?.root_id ? 'thread' : 'replythread';

    useEffect(() => {
        // 设置左侧边栏选中状态为话题页
        dispatch(selectLhsItem(LhsItemType.Page, LhsPage.Topics));
    }, [dispatch]);

    // 获取主帖
    useEffect(() => {
        const fetchTopicDetail = async () => {
            if (currentTeamId && currentUserId && topicId) {
                setIsLoading(true);
                setError(null);
                try {
                    const result = await dispatch(getPost(topicId));
                    if (result.data) {
                        setTopic(result.data);
                        // 如果有引用消息，获取引用内容
                        if (result.data.qpid) {
                            const quoted = await dispatch(getPost(result.data.qpid));
                            setQuotedPost(quoted);
                        }
                    } else {
                        setError('话题不存在或无法访问');
                    }
                } catch (error) {
                    console.error('Failed to fetch topic detail:', error);
                    setError('获取话题详情失败');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchTopicDetail();
    }, [dispatch, currentTeamId, currentUserId, topicId]);


    // 通用方法: 获取回复列表, 更新回复树
    const fetchReplies = async (commentNode: CommentNode, location: string, threadType: string, replvl: number) => {
        const reps = await Client4.getTopicReplies(
            currentUserId,
            currentTeamId,
            commentNode.id,
            commentNode.pid || '',
            commentNode.rid || '',
            location,
            threadType,
            replvl,
            {
                before: commentNode.before,
                after: commentNode.after,
                perPage: 10,
                direction: 'next',
                orderMode: 'latest',
                postRole: commentNode.role == 'comment' ? 'comment' : 'topic',
            });

        return reps;
    }

    // 话题是引用串, 则获取话题的直接回复
    if (quotedPost) {
        useEffect(() => {
            fetchReplies(topicDirectReplyTree, 'topic', threadType, 2).then(reps => {
                topicDirectReplyTree.update(topicId, reps)
                setTopicDirectReplyTree(topicDirectReplyTree.copy()); // 引用改变, 重渲染;
            })
        }, [topicId]);
    }

    // 话题的评论树
    useEffect(() => {
        fetchReplies(topicCommentTree, 'topic', threadType, 1).then(reps => {
            topicCommentTree.update(topicId, reps)
            setTopicCommentTree(topicCommentTree.copy()); // 引用改变, 重渲染;
        })
    }, [topicId]);


    // 话题回复分页变化, 加载更多, 追加方式
    const handleReplyPageChange = (commentNode: CommentNode, location: string, threadType: string, replvl: number) => {
        fetchReplies(commentNode, location, threadType, replvl);
    }


    // useEffect(() => {
    //     const fetchComments = async () => {
    //         const cmts = await Client4.getPostReplies(currentUserId, currentTeamId, topicId, {
    //             before: rollPageOpts[0],
    //             after: rollPageOpts[1],
    //             perPage: 10,
    //             direction: rollPageOpts[2],
    //             orderMode: 'latest',
    //             postRole: 'reply',
    //         });
    //         // 过滤掉主帖本身
    //         setComments(cmts);
    //     };
    //     fetchComments();
    // }, [topicId, rollPageOpts]);

    // 如果团队ID不匹配或正在加载，显示加载状态
    if (!currentTeamId || isLoading) {
        return <LoadingScreen centered={true} />;
    }

    if (error) {
        return (
            <div className='topic-detail'>
                <div className='error-state'>
                    <div className='error-icon'>⚠️</div>
                    <div className='error-message'>{error}</div>
                </div>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className='topic-detail'>
                <div className='loading-state'>话题加载中...</div>
            </div>
        );
    }

    // 使用 markdown 转纯文本
    const topicPlainText = useMd2PlainText(topic?.message, {
        maxLength: 200,
    });

    const quotedPlainText = quotedPost ? useMd2PlainText(quotedPost?.message, {
        maxLength: 100,
    }) : null;

    return (
        <div className='topic-detail'>
            <div className='topic-detail__header'>
                <h1>{topicPlainText || '话题标题加载中...'}</h1>
                <p>团队: {team}</p>
                <p>话题ID: {topicId}</p>
            </div>
            <div className='topic-detail__content'>
                <div className='topic-detail__main'>
                    <h2>话题内容</h2>
                    <div className='topic-content'>
                        <p>{topic.message}</p>
                    </div>

                    {quotedPost && (
                        <div className='topic-quoted'>
                            <strong>引用内容</strong>
                            <span>{quotedPlainText}</span>
                        </div>
                    )}
                </div>

                <div className='topic-meta'>
                    <span>作者: {topic.user_id || '未知'}</span>
                    <span>时间: {formatTime(topic.create_at)}</span>
                    <span>回复数: {topic.reply_count || 0}</span>
                </div>

                <div className='topic-detail__comments'>
                    <h3>评论区 ({topicCommentTree.childrenSize()})</h3>
                    <div className='comments-list'>
                        {!topicCommentTree.hasChildren() ? (
                            <div className='no-comments'>暂无评论</div>
                        ) : (
                            topicCommentTree.children.map((comment) => (
                                <div key={comment.id} className='comment'>
                                    <div className='comment-content'>
                                        {comment.data.message}
                                    </div>
                                    <div className='comment-meta'>
                                        <span className='comment-author'>
                                            {comment.data.user_id || '未知用户'}
                                        </span>
                                        <span className='comment-time'>
                                            {formatTime(comment.data.create_at)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopicDetail; 