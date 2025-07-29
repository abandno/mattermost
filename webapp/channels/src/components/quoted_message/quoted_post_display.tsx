// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { useSelector } from 'react-redux';

import type { Post } from '@mattermost/types/posts';

import { getPost } from 'mattermost-redux/selectors/entities/posts';

import QuotedMessage from './quoted_message';

import { GlobalState } from 'types/store';
import { Locations } from 'utils/constants';

interface Props {
    post: Post;
    location: keyof typeof Locations | string;
    currentUserId: string;
}

export default function QuotedPostDisplay({ post, location, currentUserId }: Props) {
    // 检查消息是否有引用
    if (!post.rid && !post.pid) {
        return null;
    }

    // 获取被引用的消息
    const quotedPost = useSelector((state: GlobalState) => {
        const postId = post.pid || post.rid;
        return postId ? getPost(state, postId) : null;
    });

    if (!quotedPost) {
        return null;
    }

    return (
        <div className='quoted-post-display'>
            <QuotedMessage
                location={location}
                currentUserId={currentUserId}
                quotedPost={quotedPost}
            />
        </div>
    );
} 