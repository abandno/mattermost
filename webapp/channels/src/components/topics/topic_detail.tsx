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
import Markdown from 'components/markdown';
import ReplyList from './reply_list';

const PER_PAGE = 2;

const TopicDetail = () => {
    const dispatch = useDispatch();
    const { team, topicId } = useParams<{ team: string; topicId: string }>();
    const currentTeamId = useSelector(getCurrentTeamId);
    const currentUserId = useSelector(getCurrentUserId);

    const [isLoading, setIsLoading] = useState(true);
    const [topic, setTopic] = useState<Post | null>(null);
    const [quotedPost, setQuotedPost] = useState<Post | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rollPageOpts, setRollPageOpts] = useState<[number, number, string]>([0, 0, 'first'])
    const [topicDirectReplyTree, setTopicDirectReplyTree] = useState<CommentTree>(new CommentTree(topicId, 'topic-reply', PER_PAGE, (data: any) => data.updateat));
    const [topicCommentTree, setTopicCommentTree] = useState<CommentTree>(new CommentTree(
        topicId, 'topic', PER_PAGE,
        // offsetExtracter
        (data) => data?.update_at
    ));

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
                        if (result.data.pid && result.data.pid !== result.data.id) {
                            const quoted = await dispatch(getPost(result.data.pid));
                            setQuotedPost(quoted.data || null);
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
    const fetchReplies = async (commentNode: CommentNode, location: string, threadTypes: string[] = [], replvl: number = 1, direction: string = 'next') => {
        try {
            const reps = await Client4.getTopicReplies(
                currentUserId,
                currentTeamId,
                {
                    postId: commentNode.id,
                    threadTypes,
                    location,
                    pid: commentNode.pid,
                    rid: commentNode.rid,
                    replvl,
                    before: commentNode.before,
                    after: commentNode.after,
                    perPage: commentNode.perPage,
                    direction,
                    orderMode: 'latest',
                    postRole: commentNode.role == 'comment' ? 'comment' : 'topic',
                });

            return reps;
        } catch (error) {
            console.error('Failed to fetch replies:', error);
            throw error;
        }
    }

    // 话题是引用串, 获取该话题的后代回复，放到话题的回复列表区域
    useEffect(() => {
        if (topic && topic.rid) {
            fetchReplies(topicDirectReplyTree, 'topic', topic.thread_types, 2).then(reps => {
                topicDirectReplyTree.update(reps?.replies, reps?.has_more)
                setTopicDirectReplyTree(topicDirectReplyTree.copy()); // 引用改变, 重渲染;
            })
        }
    }, [topic]);

    const fetchComments = (direction: string) => {
        if (!topic) {
            return;
        }
        fetchReplies(topicCommentTree, 'topic', topic.thread_types, 1, direction).then(reps => {
            topicCommentTree.update(reps?.replies, reps?.has_more, true)
            setTopicCommentTree(topicCommentTree.copy()); // 引用改变, 重渲染;
        })
    }

    // 话题的评论树
    useEffect(() => {
        fetchComments('first')
    }, [topic]);

    // 话题回复分页变化, 加载更多, 追加方式
    const handleCommentPageChange = (direction: string) => {
        fetchComments(direction)
    }

    // 回复列表区展开更多回复
    const handleLoadMoreReplies = async (node: CommentNode, replyRegionType: string, rerenderTree: () => void) => {
        if (node.isLoading || !node.canRenderMore()) {
            return;
        }

        node.isLoading = true;
        try {
            let ok = node.renderMore(node.perPage)
            if (!ok) {
                // 不够render, 加载  --第一次
                let resp
                if (replyRegionType == 'topic-reply') {
                    // 话题的直接回复区
                    resp = await fetchReplies(node, 'topic', topic?.thread_types, 2)
                } else {
                    // 评论的回复区  只是 replythread
                    resp = await fetchReplies(node, 'comment', ['replythread'])
                }
                node.update(resp.replies, resp.has_more)
                node.renderMore(node.perPage)
            } else if (node.renderCount > node.perPage) {
                // TODO 后面页的消息等字段是懒加载模式的
                
            }
        } finally {
            node.isLoading = false
            rerenderTree(); // 引用改变, 重渲染;
        }
    }

    const handleFoldReplies = (node: CommentNode, rerenderTree: () => void) => {
        node.renderCount = 0;
        rerenderTree();
    }

    // 使用 markdown 转纯文本
    const [topicPlainText, isMdTopic] = useMd2PlainText(topic?.message, { maxLength: 100 });
    const [quotedPlainText, _] = useMd2PlainText(quotedPost?.message, { maxLength: 100 });

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

    return (
        <div className='topic-detail-page'>
            <div className='topic-detail'>
                <div className='topic-detail__header'>
                    <h1>{topicPlainText || '话题标题加载中...'}</h1>
                    {quotedPost && (
                        <div className='topic-quoted'>
                            <span>{quotedPlainText}</span>
                        </div>
                    )}
                    <div className='topic-meta'>
                        <span>作者: {topic.user_id || '未知'}</span>
                        <span>时间: {formatTime(topic.create_at)}</span>
                        <span>回复数: {topic.reply_count || 0}</span>
                    </div>
                </div>
                <div className='topic-content-card'>
                    {isMdTopic && (
                        <div className='topic-detail__content'>
                            <div className='topic-content'>
                                <Markdown
                                    message={topic.message}
                                />
                            </div>
                        </div>
                    )}
                    <ReplyList
                        node={topicDirectReplyTree}
                        onMore={(node) => handleLoadMoreReplies(node, 'topic-reply', () => setTopicDirectReplyTree(topicDirectReplyTree.copy()))}
                        onFold={(node) => handleFoldReplies(node, () => setTopicDirectReplyTree(topicDirectReplyTree.copy()))}
                    />
                    {/* {topicDirectReplyTree.hasChildren() && (
                        <div className='topic-direct-reply'>
                            <div className='topic-direct-reply__comments'>
                                {topicDirectReplyTree.renderChildren((comment) => (
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
                                ))}
                            </div>
                            <div
                                className={`topic-direct-reply__load-more`}
                            >
                                {topicDirectReplyTree.isLoading ? (
                                    <span>加载中...</span>
                                ) : (
                                    <div>
                                        {topicDirectReplyTree.canRenderMore() &&
                                            <span
                                                className='load-more-hint clickable'
                                                onClick={() => handleLoadMoreReplies(topicDirectReplyTree, 'topic-reply', () => setTopicDirectReplyTree(topicDirectReplyTree.copy()))}
                                            >
                                                {topicDirectReplyTree.renderCount >= topicDirectReplyTree.perPage ? '展开更多' : '展开 ' + topicDirectReplyTree.childrenSize() + ' 条回复'}
                                            </span>
                                        }
                                        {topicDirectReplyTree.renderCount > 0 && (
                                            <span
                                                className='load-more-hint clickable'
                                                onClick={() => handleFoldReplies(topicDirectReplyTree, () => setTopicDirectReplyTree(topicDirectReplyTree.copy()))}
                                            >
                                                收起
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )} */}
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
                                    <ReplyList
                                        node={comment}
                                        onMore={(node) => handleLoadMoreReplies(node, 'comment-reply', () => setTopicCommentTree(topicCommentTree.copy()))}
                                        onFold={(node) => handleFoldReplies(node, topicCommentTree)}
                                    />
                                    {/* {comment.canRenderMore() && (
                                        <div className='topic-direct-reply'>
                                            <div className='topic-direct-reply__comments'>
                                                {comment.renderChildren((reply) => (
                                                    <div key={reply.id} className='comment'>
                                                        <div className='comment-content'>
                                                            {reply.data.message}
                                                        </div>
                                                        <div className='comment-meta'>
                                                            <span className='comment-author'>
                                                                {reply.data.user_id || '未知用户'}
                                                            </span>
                                                            <span className='comment-time'>
                                                                {formatTime(reply.data.create_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div
                                                className={`topic-direct-reply__load-more`}
                                            >
                                                {comment.isLoading ? (
                                                    <span>加载中...</span>
                                                ) : (
                                                    <div>
                                                        {comment.canRenderMore() &&
                                                            <span
                                                                className='load-more-hint clickable'
                                                                onClick={() => handleLoadMoreReplies(comment, 'comment-reply', () => setTopicCommentTree(topicCommentTree.copy()))}
                                                            >
                                                                {comment.renderCount >= comment.perPage ? '展开更多' : '展开 ' + comment.childrenSize() + ' 条回复'}
                                                            </span>
                                                        }
                                                        {comment.renderCount > 0 && (
                                                            <span
                                                                className='load-more-hint clickable'
                                                                onClick={() => handleFoldReplies(comment, () => setTopicCommentTree(topicCommentTree.copy()))}
                                                            >
                                                                收起
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )} */}
                                </div>
                            ))
                        )}
                    </div>
                    <div className='comment-pagination'>
                        <button className='comment-pagination__button' onClick={() => handleCommentPageChange('first')}>首页</button>
                        <button className='comment-pagination__button' onClick={() => handleCommentPageChange('prev')}>上一页</button>
                        <button className='comment-pagination__button' onClick={() => handleCommentPageChange('next')}>下一页</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopicDetail; 