// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useMemo } from 'react';
import {FormattedMessage} from 'react-intl';

import type {Post} from '@mattermost/types/posts';

import {makeGetDisplayName} from 'mattermost-redux/selectors/entities/users';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';

import PostMarkdown from 'components/post_markdown';
import Avatar from 'components/widgets/users/avatar';
import Timestamp from 'components/timestamp';

import {Constants} from 'utils/constants';
import * as Utils from 'utils/utils';

import './quoted_message.scss';
import { GlobalState } from 'types/store';
import { useSelector } from 'react-redux';
import { getPost } from 'mattermost-redux/selectors/entities/posts';

interface Props {
    currentUserId: string;
    onRemove?: () => void;
}

export default function QuotedMessage({
    currentUserId,
    onRemove,
}: Props) {
    const quotedPostId = useSelector((state: GlobalState) => {
        console.log('==state.views', state.views)
        return state.views.quote?.quotedPostId
    })
    if (!quotedPostId) {
        return null;
    }
    const quotePost: Post = useSelector((state: GlobalState) => getPost(state, quotedPostId));
    if (!quotePost) {
        return null;
    }

    const channel = useSelector((state: GlobalState) => getChannel(state, quotePost.channel_id));
    const getDisplayName = useMemo(makeGetDisplayName, []);
    const isOwnPost = quotePost.user_id === currentUserId;
    const displayName = useSelector((state: GlobalState) => (getDisplayName(state, quotePost.user_id)));


    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove?.();
    };

    return (
        <div className='quoted-message'>
            <div className='quoted-message__header'>
                {onRemove && (
                    <button
                        className='quoted-message__remove'
                        onClick={handleRemove}
                        aria-label={'Remove quoted message'}
                    >
                        <i className='icon icon-close' />
                    </button>
                )}
                <div className='quoted-message__user-info'>
                    {/* <Avatar
                        username={post.user_id}
                        size='sm'
                        url={Utils.imageURLForUser(post.user_id)}
                    /> */}
                    <span className='quoted-message__username'>
                        {displayName}
                    </span>
                    {channel && (
                        <span className='quoted-message__channel'>
                            #{channel.display_name}
                        </span>
                    )}
                    <Timestamp
                        value={quotePost.create_at}
                        units={['now', 'minute', 'hour']}
                        useTime={false}
                    />
                </div>
            </div>
            <div className='quoted-message__content'>
                <PostMarkdown
                    message={quotePost.message}
                    channelId={quotePost.channel_id}
                    imageProps={{hideUtilities: true}}
                />
            </div>
        </div>
    );
} 