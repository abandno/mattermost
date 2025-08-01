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
import UserProfile from 'components/user_profile';
import ProfilePicture from 'components/profile_picture';
import { useUser } from 'components/common/hooks/useUser';

import './topic_detail.scss';
import { Post } from '@mattermost/types/posts';
import Markdown from 'components/markdown';
import ReplyList from './reply_list';

const PER_PAGE = 2;

// 批量获取用户资料的 hook
const useUsers = (userIds: string[]) => {
    const dispatch = useDispatch();
    const users = useSelector((state: any) => {
        const result: Record<string, any> = {};
        userIds.forEach(userId => {
            if (userId) {
                result[userId] = state.entities.users.profiles[userId];
            }
        });
        return result;
    });

    useEffect(() => {
        const missingUserIds = userIds.filter(userId => userId && !users[userId]);
        if (missingUserIds.length > 0) {
            // 批量获取缺失的用户资料
            import('mattermost-redux/actions/users').then(({ getMissingProfilesByIds }) => {
                dispatch(getMissingProfilesByIds(missingUserIds));
            }).catch(error => {
                console.error('Failed to load missing profiles:', error);
            });
        }
    }, [dispatch, userIds.join(','), users]); // 使用 userIds.join(',') 作为依赖，避免对象比较

    return users;
};


// 单独的评论组件，可以安全地调用 useUser hook
const CommentItem = ({ comment, onMore, onFold }: {
    comment: CommentNode;
    onMore: (node: CommentNode) => void;
    onFold: (node: CommentNode) => void;
}) => {
    const commentAuthor = useUser(comment.data.user_id || '');

    return (
        <div className='comment'>
            <div className='comment-header'>
                <ProfilePicture
                    src={commentAuthor ? Client4.getProfilePictureUrl(commentAuthor.id, commentAuthor.last_picture_update) : ''}
                    size='xs'
                    userId={commentAuthor?.id}
                    username={commentAuthor?.username}
                />
                <UserProfile
                    userId={comment.data.user_id}
                    displayUsername={true}
                />
                <span className='comment-time'>
                    {formatTime(comment.data.create_at)}
                </span>
            </div>
            <div className='comment-content'>
                {comment.data.message}
            </div>
            <ReplyList
                node={comment}
                onMore={onMore}
                onFold={onFold}
            />
        </div>
    );
};

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
    const [topicDirectReplyTree, setTopicDirectReplyTree] = useState<CommentTree>(new CommentTree(
        'topicDirectReplyTree', topicId, 'topic-reply', PER_PAGE,
        (data: any) => data.update_at,
        2
    ));
    const [topicCommentTree, setTopicCommentTree] = useState<CommentTree>(new CommentTree(
        'topicCommentTree', topicId, 'topic', PER_PAGE,
        // offsetExtracter
        (data) => data?.update_at
    ));

    // 获取话题作者的用户资料
    const topicAuthor = useUser(topic?.user_id || '');

    // 收集所有需要的用户 ID 进行批量获取
    const allUserIds = React.useMemo(() => {
        const userIds: Set<string> = new Set();

        // 添加话题作者
        if (topic?.user_id) {
            userIds.add(topic.user_id);
        }

        // 添加引用消息作者
        if (quotedPost?.user_id) {
            userIds.add(quotedPost.user_id);
        }

        // 添加评论作者
        topicCommentTree.children?.forEach(comment => {
            if (comment.data.user_id) {
                userIds.add(comment.data.user_id);
            }
            // 添加评论的回复作者
            comment.renderChildren((reply) => {
                if (reply.data.user_id) {
                    userIds.add(reply.data.user_id);
                }
                if (reply.data.puser_id) {
                    userIds.add(reply.data.puser_id);
                }
            });
        });


        // 添加话题直接回复的作者
        topicDirectReplyTree.children?.forEach((reply) => {
            if (reply.data.user_id) {
                userIds.add(reply.data.user_id);
            }
            if (reply.data.puser_id) {
                userIds.add(reply.data.puser_id);
            }
        });

        return Array.from(userIds);
    }, [topic, quotedPost, topicCommentTree, topicDirectReplyTree]);

    // 批量获取用户资料
    const allUsers = useUsers(allUserIds); // 尽量收集当前已知的用户列表, 调用下即可, 批量获取用户信息, 放redux

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
    const handleLoadMoreReplies = async (node: CommentNode, replyRegionType: string, rerenderTree: () => void, more?: number) => {
        if (node.isLoading || !node.canRenderMore()) {
            return;
        }
        more = more || node.perPage;
        node.isLoading = true;
        try {
            let ok = node.renderMore(more)
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
                node.renderMore(more)
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
                        <div className='topic-author'>
                            <ProfilePicture
                                src={topicAuthor ? Client4.getProfilePictureUrl(topicAuthor.id, topicAuthor.last_picture_update) : ''}
                                size='sm'
                                userId={topicAuthor?.id}
                                username={topicAuthor?.username}
                            />
                            <UserProfile
                                userId={topic.user_id}
                                displayUsername={true}
                            />
                        </div>
                        <span className='topic-time'>时间: {formatTime(topic.create_at)}</span>
                        <span className='topic-replies'>回复数: {topic.reply_count || 0}</span>
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
                        onMore={(node, more) => handleLoadMoreReplies(node, 'topic-reply', () => setTopicDirectReplyTree(topicDirectReplyTree.copy()), more)}
                        onFold={(node) => handleFoldReplies(node, () => setTopicDirectReplyTree(topicDirectReplyTree.copy()))}
                    />
                </div>
                <div className='topic-detail__comments'>
                    <h3>评论区 ({topicCommentTree.childrenSize()})</h3>
                    <div className='comments-list'>
                        {!topicCommentTree.hasChildren() ? (
                            <div className='no-comments'>暂无评论</div>
                        ) : (
                            topicCommentTree.children.map((comment) => {
                                return (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        onMore={(node) => handleLoadMoreReplies(node, 'comment-reply', () => setTopicCommentTree(topicCommentTree.copy()))}
                                        onFold={(node) => handleFoldReplies(node, () => setTopicCommentTree(topicCommentTree.copy()))}
                                    />
                                );
                            })
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