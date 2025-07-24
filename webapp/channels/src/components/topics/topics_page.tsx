// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';

import { getCurrentTeamId } from 'mattermost-redux/selectors/entities/teams';
import { getCurrentUserId } from 'mattermost-redux/selectors/entities/users';

import { selectLhsItem } from 'actions/views/lhs';
import { LhsItemType, LhsPage } from 'types/store/lhs';

import LoadingScreen from 'components/loading_screen';
import {useMd2PlainText} from 'hooks/useMd2PlainText';
import { formatTime } from 'utils/datetime';

import './topics_page.scss';
import { getHotTopicsAction, hotTopicsSelector } from 'mattermost-redux/reducers/combine/topic';
import { Post } from '@mattermost/types/posts';

// 渲染话题项组件 - 移到组件外部
const TopicItem = ({ topic, team }: { topic: Post, team: string }) => {
    const history = useHistory();

    const handleTopicClick = (topic: Post) => {
        console.log('==handleTopicClick topic', topic, team);
        // 跳转到帖子详情页，格式 /团队/topics/话题id
        if (team && topic?.id) {
            history.push(`/${team}/topics/${topic.id}`);
        }
    };

    // Use the new hook for markdown to plain text conversion
    const [plainText, isMd] = useMd2PlainText(topic?.message, {maxLength: 100});

    return (
        <div className='topic-item' onClick={() => handleTopicClick(topic)}>
            <div className='topic-title'>
                {plainText || '话题标题加载中...'}
            </div>
            <div className='topic-meta'>
                <span className='topic-author'>作者: {topic?.user_id || '未知'}</span>
                <span className='topic-replies'>{topic.reply_count || 0} 回复</span>
                <span className='topic-time'>{formatTime(topic.last_reply_at || topic.create_at)}</span>
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
    const [error, setError] = useState<string | null>(null);
    const [rollPageOpts, setRollPageOpts] = useState<[number, number, string]>([0, 0, 'first'])
    
    // 按回复数排序，获取热门话题（回复数多的）
    const hotTopics = useSelector(hotTopicsSelector);
    const latestTopics: Post[] = []

    useEffect(() => {
        // 设置左侧边栏选中状态为话题页
        dispatch(selectLhsItem(LhsItemType.Page, LhsPage.Topics));
    }, [dispatch]);

    useEffect(() => {
        const fetchHotTopics = async () => {
            if (currentTeamId && currentUserId) {
                setIsLoading(true);
                setError(null);
                try {
                    await dispatch(getHotTopicsAction({
                        before: rollPageOpts[0],
                        after: rollPageOpts[1],
                        perPage: 10,
                        direction: rollPageOpts[2],
                    }));
                } catch (error) {
                    console.error('Failed to fetch threads:', error);
                    setError('获取话题列表失败');
                } finally {
                    setIsLoading(false);
                }
            }
        }

        fetchHotTopics();
    }, [dispatch, currentTeamId, currentUserId, rollPageOpts])

    // 如果团队ID不匹配或正在加载，显示加载状态
    if (!currentTeamId || isLoading) {
        return <LoadingScreen centered={true} />;
    }

    if (error) {
        return (
            <div className='topics-page'>
                <div className='error-state'>
                    <div className='error-icon'>⚠️</div>
                    <div className='error-message'>{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className='topics-page'>
            <div className='topics-page__header'>
                <h1>话题页</h1>
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
                                <TopicItem key={topic.postId} topic={topic} team={team} />
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
                                <TopicItem key={topic.id} topic={topic} team={team} />
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