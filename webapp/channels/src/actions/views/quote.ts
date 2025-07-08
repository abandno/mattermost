// import type { Post } from '@mattermost/types/posts';
// import { ActionTypes } from "utils/constants";
// import { Locations } from "utils/constants";


// export function selectQuotedPost(
//     post: Post | null,
//     location: keyof typeof Locations | string,
//     previousState?: any) {
//     console.log('==actions selectQuotedPost', location)
//     return {
//         type: ActionTypes.SELECT_QUOTE_POST,
//         postId: post && (post.root_id || post.id),
//         channelId: post?.channel_id,
//         previousState,
//         timestamp: Date.now(),
//         location,
//         // location: location?.startsWith('RHS_') ? 'rhs' : 'center',
//     }
// }