// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { combineReducers } from 'redux';


import type { MMAction } from 'types/store';
import { ActionTypes } from 'utils/constants';


function selectQuotedPostId(state = '', action: MMAction) {
    console.log('==selectQuotedPostId reducer', action);
    switch (action.type) {
        case ActionTypes.SELECT_QUOTE_POST:
            return action.postId;
    }
    return '';
}

export default combineReducers({
    quotedPostId: selectQuotedPostId,
});
