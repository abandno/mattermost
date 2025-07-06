import type { Post } from '@mattermost/types/posts';
import { ActionTypes } from "utils/constants";



export function selectQuotedPost(post: Post | null, previousState?: any) {
    return {
        type: ActionTypes.SELECT_QUOTE_POST,
        postId: post && (post.root_id || post.id),
        channelId: post?.channel_id,
        previousState,
        timestamp: Date.now(),
    }
}