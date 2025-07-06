// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { connect } from 'react-redux';
import { getSelectedChannel, getSelectedPost } from 'selectors/rhs';
import AdvancedCreatePost from './advanced_create_post';
import { GlobalState } from 'types/store';
import { bindActionCreators, Dispatch } from 'redux';
import { selectPost } from 'actions/views/rhs';
import { selectQuotedPost } from 'actions/views/quote';

// export default AdvancedCreatePost;

function mapStateToProps(state: GlobalState) {
    const selected = getSelectedPost(state);
    const channel = getSelectedChannel(state);

    return {
        selected,
        channel,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            selectPost,
            selectQuotedPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AdvancedCreatePost);