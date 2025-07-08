// // Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// // See LICENSE.txt for license information.

// import { combineReducers } from 'redux';


// import type { MMAction } from 'types/store';
// import { ActionTypes, Locations } from 'utils/constants';

// const initialState = {
//     [Locations.CENTER]: null,
//     // RHS_ROOT --> RHS_COMMENT
//     [Locations.RHS_COMMENT]: null,
// };

// function selectQuotedPostId(state = initialState, action: MMAction) {
//     console.log('==selectQuotedPostId reducer', action);
//     switch (action.type) {
//         case ActionTypes.SELECT_QUOTE_POST:
//             const loc = action.location == Locations.RHS_ROOT ? Locations.RHS_COMMENT : action.location;
//             return {
//                 ...state,
//                 [loc]: action.postId,
//             };
//     }
//     return state;
// }

// export default combineReducers({
//     // state.views.quote.quotedPostId.[location]
//     quotedPostId: selectQuotedPostId,
// });
