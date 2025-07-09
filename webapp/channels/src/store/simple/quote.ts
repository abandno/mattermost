// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { combineReducers } from 'redux';
import type { Post } from '@mattermost/types/posts';
import type { GlobalState, MMAction } from 'types/store';
import { ActionTypes, Locations } from 'utils/constants';
import { getPost } from 'mattermost-redux/selectors/entities/posts';

const initialState = {
    [Locations.CENTER]: null,
    // RHS_ROOT --> RHS_COMMENT
    [Locations.RHS_COMMENT]: null,
};

function quotedPostIdReducer(state = initialState, action: MMAction) {
    // console.log('==selectQuotedPostId reducer', action);
    switch (action.type) {
        case ActionTypes.SELECT_QUOTE_POST:
            const loc = action.location == Locations.RHS_ROOT ? Locations.RHS_COMMENT : action.location;
            return {
                ...state,
                [loc]: action.postId,
            };
    }
    return state;
}

export const reducers = combineReducers({
    // state.views.quote.quotedPostId.[location]
    quotedPostId: quotedPostIdReducer,
});


export const quotedPostAction = (
    post: Post | null,
    location: keyof typeof Locations | string,
    previousState?: any) => {
    // console.log('==actions selectQuotedPost', location)
    return {
        type: ActionTypes.SELECT_QUOTE_POST,
        postId: post && (post.root_id || post.id),
        channelId: post?.channel_id,
        previousState,
        timestamp: Date.now(),
        location,
        // location: location?.startsWith('RHS_') ? 'rhs' : 'center',
    }
}

export function removeQuotedPostAction(location: keyof typeof Locations | string) {
    return quotedPostAction(null, location);
}

export const quotedPostIdSelector = (state: GlobalState, location: string) => {
    // console.log('quotedPostIdSelector', state.simple.quote.quotedPostId, location);
    return state.simple.quote.quotedPostId[location];
}

export const quotedPostSelector = (state: GlobalState, location: string) => {
    const quotedPostId = quotedPostIdSelector(state, location);
    if (!quotedPostId) return null;
    return getPost(state, quotedPostId);
}


// export ====
// export { reducers };
// const actions = { quotedPostAction };
// const selectors = { quotedPostIdSelector, quotedPostSelector };

// export {
//     reducers,
//     quotedPostAction,
//     quotedPostIdSelector,
//     quotedPostSelector
// };