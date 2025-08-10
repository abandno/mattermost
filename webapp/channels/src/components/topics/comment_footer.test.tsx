import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import CommentFooter from './comment_footer';
import { Post } from '@mattermost/types/posts';

const mockStore = configureStore([thunk]);

const mockPost: Post = {
    id: 'post-id-1',
    channel_id: 'channel-id-1',
    root_id: '',
    user_id: 'user-id-1',
    message: 'Test post message',
    create_at: Date.now(),
    update_at: Date.now(),
    edit_at: 0,
    delete_at: 0,
    is_pinned: false,
    original_id: '',
    type: '',
    props: {},
    hashtags: '',
    pending_post_id: '',
    reply_count: 0,
    metadata: {
        embeds: [],
        emojis: [],
        files: [],
        images: {},
    },
};

describe('CommentFooter', () => {
    let store: any;

    beforeEach(() => {
        store = mockStore({
            entities: {
                users: {
                    currentUserId: 'current-user-id',
                },
            },
        });
    });

    it('should render reply button', () => {
        render(
            <Provider store={store}>
                <CommentFooter post={mockPost} />
            </Provider>
        );

        expect(screen.getByText('回复')).toBeInTheDocument();
    });

    it('should show input when reply button is clicked', () => {
        render(
            <Provider store={store}>
                <CommentFooter post={mockPost} />
            </Provider>
        );

        const replyButton = screen.getByText('回复');
        fireEvent.click(replyButton);

        expect(screen.getByPlaceholderText('输入评论...')).toBeInTheDocument();
        expect(screen.getByText('取消')).toBeInTheDocument();
        expect(screen.getByText('发送')).toBeInTheDocument();
    });

    it('should hide input when cancel button is clicked', () => {
        render(
            <Provider store={store}>
                <CommentFooter post={mockPost} />
            </Provider>
        );

        // Show input
        const replyButton = screen.getByText('回复');
        fireEvent.click(replyButton);

        // Hide input
        const cancelButton = screen.getByText('取消');
        fireEvent.click(cancelButton);

        expect(screen.queryByPlaceholderText('输入评论...')).not.toBeVisible();
        expect(screen.getByText('回复')).toBeInTheDocument();
    });

    it('should disable send button when text is empty', () => {
        render(
            <Provider store={store}>
                <CommentFooter post={mockPost} />
            </Provider>
        );

        // Show input
        const replyButton = screen.getByText('回复');
        fireEvent.click(replyButton);

        const sendButton = screen.getByText('发送');
        expect(sendButton).toBeDisabled();
    });

    it('should enable send button when text is entered', () => {
        render(
            <Provider store={store}>
                <CommentFooter post={mockPost} />
            </Provider>
        );

        // Show input
        const replyButton = screen.getByText('回复');
        fireEvent.click(replyButton);

        const textarea = screen.getByPlaceholderText('输入评论...');
        fireEvent.change(textarea, { target: { value: 'Test reply message' } });

        const sendButton = screen.getByText('发送');
        expect(sendButton).not.toBeDisabled();
    });

    it('should dispatch onSubmit when send button is clicked', async () => {
        const mockDispatch = jest.fn().mockResolvedValue({ data: true });
        store.dispatch = mockDispatch;

        render(
            <Provider store={store}>
                <CommentFooter post={mockPost} />
            </Provider>
        );

        // Show input
        const replyButton = screen.getByText('回复');
        fireEvent.click(replyButton);

        // Enter text
        const textarea = screen.getByPlaceholderText('输入评论...');
        fireEvent.change(textarea, { target: { value: 'Test reply message' } });

        // Click send
        const sendButton = screen.getByText('发送');
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(mockDispatch).toHaveBeenCalled();
        });
    });
});
