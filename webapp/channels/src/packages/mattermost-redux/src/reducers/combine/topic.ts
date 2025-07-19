import { combineReducers } from "redux";
import { batchActions } from 'redux-batched-actions';
import { TopicTypes } from 'mattermost-redux/action_types';
import { logError } from 'mattermost-redux/actions/errors';
import { forceLogoutIfNecessary } from 'mattermost-redux/actions/helpers';
import { Client4 } from 'mattermost-redux/client';
import { General } from 'mattermost-redux/constants';
import { getCurrentUserId } from 'mattermost-redux/selectors/entities/common';
import { ActionFuncAsync, DispatchFunc, GetStateFunc } from 'mattermost-redux/types/actions';

import { MMAction } from "types/store";
import { getCurrentTeamId } from "mattermost-redux/selectors/entities/teams";
import { getMissingProfilesByIds } from "mattermost-redux/actions/users";
import type {GlobalState} from '@mattermost/types/store';

const initialState = {
    hotTopics: [],
}


export function getHotTopicsAction({
    before = 0,
    after = 0,
    perPage = 10,
    direction = 'first',
}): ActionFuncAsync<any[]> {

    return async (dispatch, getState) => {
        const state = getState();

        dispatch({ type: TopicTypes.GET_HOT_TOPICS, data: null });

        let topics;
        try {
            topics = await Client4.getTopics(
                getCurrentUserId(state),
                getCurrentTeamId(state),
                {
                    before,
                    after,
                    perPage,
                    direction,
                    type: 'hot'
            });
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch({ type: TopicTypes.GET_TOPICS_FAILURE, data: null });
            dispatch(logError(error));
            return { error };
        }

        const actions: any[] = [
            {
                type: TopicTypes.RECEIVED_HOT_TOPICS,
                data: topics,
            },
            {
                type: TopicTypes.GET_TOPICS_SUCCESS,
                data: null,
            },
        ];

        // Get missing user profiles
        if (topics && topics.length > 0) {
            const userIds = new Set<string>();
            topics.forEach((topic: any) => {
                if (topic.post && topic.post.user_id) {
                    userIds.add(topic.post.user_id);
                }
                if (topic.latest_reply && topic.latest_reply.user_id) {
                    userIds.add(topic.latest_reply.user_id);
                }
            });
            if (userIds.size > 0) {
                dispatch(getMissingProfilesByIds(Array.from(userIds)));
            }
        }

        dispatch(batchActions(actions));

        return { data: topics };
    };


}

function hotTopicsReducer(state = initialState, action: MMAction) {
    switch (action.type) {
        case TopicTypes.RECEIVED_HOT_TOPICS:
            return action.data;
        default:
            return state;
    }
}

export function hotTopicsSelector(state: GlobalState) {
    return state.topic.hotTopics;
}


export default combineReducers({
    hotTopics: hotTopicsReducer,
});