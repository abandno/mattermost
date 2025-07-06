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
    return state;  // 返回 state , 关心的类型的字段就不会改变, 神奇!!
}

export default combineReducers({
    quotedPostId: selectQuotedPostId,
});
