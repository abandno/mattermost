// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import QuotedMessage from './quoted_message';

describe('QuotedMessage', () => {
    const baseProps = {
        post: {
            id: 'post1',
            message: 'Test message',
            user_id: 'user1',
            channel_id: 'channel1',
            create_at: 1234567890,
        },
        currentUserId: 'user1',
        currentTeamId: 'team1',
        onRemove: jest.fn(),
    };

    test('should render correctly', () => {
        const wrapper = shallow(<QuotedMessage {...baseProps} />);
        expect(wrapper).toMatchSnapshot();
    });

    test('should call onRemove when remove button is clicked', () => {
        const wrapper = shallow(<QuotedMessage {...baseProps} />);
        const removeButton = wrapper.find('.quoted-message__remove');
        
        removeButton.simulate('click');
        
        expect(baseProps.onRemove).toHaveBeenCalled();
    });

    test('should not render remove button when onRemove is not provided', () => {
        const propsWithoutRemove = {...baseProps};
        delete propsWithoutRemove.onRemove;
        
        const wrapper = shallow(<QuotedMessage {...propsWithoutRemove} />);
        const removeButton = wrapper.find('.quoted-message__remove');
        
        expect(removeButton).toHaveLength(0);
    });
}); 