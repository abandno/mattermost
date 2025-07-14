// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';

import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getThreadsForCurrentTeam} from 'mattermost-redux/actions/threads';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getThreadsInCurrentTeam, getThreads} from 'mattermost-redux/selectors/entities/threads';

import {selectLhsItem} from 'actions/views/lhs';
import {LhsItemType, LhsPage} from 'types/store/lhs';

import LoadingScreen from 'components/loading_screen';

import type {GlobalState} from 'types/store';
import type {UserThread} from '@mattermost/types/threads';

import './topics_page.scss';

const TopicsPage = () => {
    const dispatch = useDispatch();
    const {team} = useParams<{team: string}>();
    const currentTeamId = useSelector(getCurrentTeamId);
    const currentUserId = useSelector(getCurrentUserId);
    
    // 获取讨论串数据
    const threadIds = useSelector(getThreadsInCurrentTeam);
    const threadsMap = useSelector(getThreads);
    const [isLoading, setIsLoading] = useState(true);

    // 将threadIds转换为完整的thread对象数组
    const threads = useMemo(() => {
        return threadIds.map(id => threadsMap[id]).filter(Boolean);
    }, [threadIds, threadsMap]);

    useEffect(() => {
        // 设置左侧边栏选中状态为话题页
        dispatch(selectLhsItem(LhsItemType.Page, LhsPage.Topics));
    }, [dispatch]);

    useEffect(() => {
        // 获取讨论串数据
        const fetchThreads = async () => {
            if (currentTeamId && currentUserId) {
                setIsLoading(true);
                try {
                    await dispatch(getThreadsForCurrentTeam({
                        unread: false
                    }));
                } catch (error) {
                    console.error('Failed to fetch threads:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchThreads();
    }, [dispatch, currentTeamId, currentUserId]);

    // 如果团队ID不匹配或正在加载，显示加载状态
    if (!currentTeamId || isLoading) {
        return <LoadingScreen centered={true}/>;
    }

    // 按回复数排序，获取热门话题（回复数多的）
    const hotTopics = useMemo(() => {
        return [...threads]
            .sort((a, b) => b.reply_count - a.reply_count)
            .slice(0, 10);
    }, [threads]);

    // 按最后回复时间排序，获取最新话题
    const latestTopics = useMemo(() => {
        return [...threads]
            .sort((a, b) => b.last_reply_at - a.last_reply_at)
            .slice(0, 10);
    }, [threads]);

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `${minutes}分钟前`;
        } else if (hours < 24) {
            return `${hours}小时前`;
        } else {
            return `${days}天前`;
        }
    };

    // 渲染话题项组件
    const TopicItem = ({thread}: {thread: UserThread}) => {
        const post = useSelector((state: GlobalState) => getPost(state, thread.id));
        
        return (
            <div className='topic-item'>
                <div className='topic-title'>
                    {post?.message ? 
                        (post.message.length > 50 ? 
                            post.message.substring(0, 50) + '...' : 
                            post.message
                        ) : 
                        '话题标题加载中...'
                    }
                </div>
                <div className='topic-meta'>
                    <span className='topic-author'>作者: {post?.user_id || '未知'}</span>
                    <span className='topic-replies'>回复数: {thread.reply_count}</span>
                    <span className='topic-time'>{formatTime(thread.last_reply_at)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className='topics-page'>
            <div className='topics-page__header'>
                <h1>话题页</h1>
                <p>团队: {team}</p>
                <p>共找到 {threads.length} 个讨论串</p>
            </div>
            <div className='topics-page__content'>
                <div className='topics-page__section'>
                    <h2>最热话题</h2>
                    <div className='topics-list'>
                        {hotTopics.length > 0 ? (
                            hotTopics.map((thread) => (
                                <TopicItem key={thread.id} thread={thread} />
                            ))
                        ) : (
                            <div className='no-topics'>暂无热门话题</div>
                        )}
                    </div>
                </div>
                <div className='topics-page__section'>
                    <h2>最新话题</h2>
                    <div className='topics-list'>
                        {latestTopics.length > 0 ? (
                            latestTopics.map((thread) => (
                                <TopicItem key={thread.id} thread={thread} />
                            ))
                        ) : (
                            <div className='no-topics'>暂无最新话题</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopicsPage; 