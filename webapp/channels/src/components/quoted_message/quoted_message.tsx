// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useMemo, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';

import type { Post } from '@mattermost/types/posts';

import { makeGetDisplayName } from 'mattermost-redux/selectors/entities/users';
import { getChannel } from 'mattermost-redux/selectors/entities/channels';

import { Locations } from 'utils/constants';
import {useMd2PlainText} from 'hooks/useMd2PlainText';

import './quoted_message.scss';
import { GlobalState } from 'types/store';
import { useSelector } from 'react-redux';
import { getPost } from 'mattermost-redux/selectors/entities/posts';
import { quotedPostSelector } from 'store/simple/quote';

// 引用消息内容的最大长度
const QUOTED_MESSAGE_MAX_LENGTH = 200;

const QuotedMessageContent = ({message}: {message: string}) => {
    // Use the new hook for markdown to plain text conversion
    const plainText = useMd2PlainText(message, {maxLength: QUOTED_MESSAGE_MAX_LENGTH});

    return (
        <div className='quoted-message__content-text'>
            {plainText}
        </div>
    );
};

interface Props {
    location: keyof typeof Locations | string;
    currentUserId: string;
    onRemove?: () => void;
    quotedPost?: Post; // 新增：可选的引用消息
}

export default function QuotedMessage({
    location,
    currentUserId,
    onRemove,
    quotedPost,
}: Props) {
    // 如果提供了 quotedPost，直接使用；否则从 Redux store 获取
    const quotePost: Post | null = quotedPost || useSelector((state: GlobalState) => quotedPostSelector(state, location));

    // 当 onRemove 非空时，监听 ESC 键事件
    useEffect(() => {
        if (!onRemove) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onRemove();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onRemove]);

    if (!quotePost) return null;

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
                    <>
                        <button
                            className='quoted-message__remove'
                            onClick={handleRemove}
                            aria-label={'Remove quoted message'}
                        >
                            <i className='icon icon-close' />
                        </button>
                        <div className='divider-char'>|</div>
                    </>
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
                    {/* {channel && (
                        <span className='quoted-message__channel'>
                            #{channel.display_name}
                        </span>
                    )} */}
                    {/* <Timestamp
                        value={quotePost.create_at}
                        units={['now', 'minute', 'hour']}
                        useTime={false}
                    /> */}
                </div>
            </div>
            <div className='divider-char'>:</div>
            <div className='quoted-message__content'>
                <QuotedMessageContent message={quotePost.message} />
            </div>
        </div>
    );
} 