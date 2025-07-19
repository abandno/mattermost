// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getCurrentTeamId } from 'mattermost-redux/selectors/entities/teams';
import { getCurrentUserId } from 'mattermost-redux/selectors/entities/users';
import { getThreadsForCurrentTeam } from 'mattermost-redux/actions/threads';
import { getPost } from 'mattermost-redux/selectors/entities/posts';
import { getThreadsInCurrentTeam, getThreads } from 'mattermost-redux/selectors/entities/threads';

import { selectLhsItem } from 'actions/views/lhs';
import { LhsItemType, LhsPage } from 'types/store/lhs';

import LoadingScreen from 'components/loading_screen';

import type { GlobalState } from 'types/store';
import type { UserThread } from '@mattermost/types/threads';

import './topics_page.scss';
import { getHotTopicsAction, hotTopicsSelector } from 'mattermost-redux/reducers/combine/topic';
import { before } from 'lodash';

// 渲染话题项组件 - 移到组件外部
const TopicItem = ({ topic }) => {
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

    const handleTopicClick = (topic) => {
        // 跳转到帖子详情页
    }

    return (
        <div className='topic-item'>
            <div className='topic-title' onClick={() => handleTopicClick(topic)}>
                {topic?.message ?
                    (topic.message.length > 50 ?
                        topic.message.substring(0, 50) + '...' :
                        topic.message
                    ) :
                    '话题标题加载中...'
                }
            </div>
            <div className='topic-meta'>
                <span className='topic-author'>作者: {topic?.user_id || '未知'}</span>
                <span className='topic-replies'>回复数: {topic.reply_count}</span>
                <span className='topic-time'>{formatTime(topic.last_reply_at)}</span>
            </div>
        </div>
    );
};

const TopicsPage = () => {
    const dispatch = useDispatch();
    const { team } = useParams<{ team: string }>();
    const currentTeamId = useSelector(getCurrentTeamId);
    const currentUserId = useSelector(getCurrentUserId);

    const [isLoading, setIsLoading] = useState(true);
    const [beforeAfter, setBeforeAfter] = useState([])
    const [direction, setDirection] = useState('first');
    // 按回复数排序，获取热门话题（回复数多的）
    const hotTopics = useSelector(hotTopicsSelector);
    const latestTopics: any[] = []

    useEffect(() => {
        // 设置左侧边栏选中状态为话题页
        dispatch(selectLhsItem(LhsItemType.Page, LhsPage.Topics));
    }, [dispatch]);

    useEffect(() => {
        const fetchHotTopics = async () => {
            if (currentTeamId && currentUserId) {
                setIsLoading(true);
                try {
                    await dispatch(getHotTopicsAction({
                        before: beforeAfter[0],
                        after: beforeAfter[1],
                        perPage: 10,
                        direction,
                    }));
                } catch (error) {
                    console.error('Failed to fetch threads:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        }

        fetchHotTopics();
    }, [dispatch, currentTeamId, currentUserId, beforeAfter, direction])

    // 如果团队ID不匹配或正在加载，显示加载状态
    if (!currentTeamId || isLoading) {
        return <LoadingScreen centered={true} />;
    }


    return (
        <div className='topics-page'>
            <div className='topics-page__header'>
                <h1>话题页</h1>
                <p>团队: {team}</p>
                <p>
                    <span>最热 {hotTopics.length}</span>
                    <span>最新 {latestTopics.length}</span>
                </p>
            </div>
            <div className='topics-page__content'>
                <div className='topics-page__section'>
                    <h2>最热话题</h2>
                    <div className='topics-list'>
                        {hotTopics.length > 0 ? (
                            hotTopics.map((topic) => (
                                <TopicItem key={topic.postId} topic={topic} />
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
                            latestTopics.map((topic) => (
                                <TopicItem key={topic.id} topic={topic} />
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