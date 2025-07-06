// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import React from 'react';
import {useSelector} from 'react-redux';

import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

import AdvancedTextEditor from 'components/advanced_text_editor/advanced_text_editor';

import {Locations} from 'utils/constants';
import type { Channel } from '@mattermost/types/channels';
import type { Post } from '@mattermost/types/posts';
import type { FakePost, RhsState } from 'types/store/rhs';

type Props = {
    channel?: Channel;
    selected: Post | FakePost;
    actions: {
        selectQuotedPost: (post: Post, previousState: RhsState) => void;
    };
}

const AdvancedCreatePost = ({
    channel,
    selected,
    actions,
    ...props
}: Props) => {
    const currentChannelId = useSelector(getCurrentChannelId);

    if (!currentChannelId) {
        return null;
    }

    return (
        <AdvancedTextEditor
            location={Locations.CENTER}
            rootId={''}
            channelId={currentChannelId}
            quotedPost={selected}
        />
    );
};

export default React.memo(AdvancedCreatePost);
