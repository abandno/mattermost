import React, { useEffect, useState } from "react"
import styled from "styled-components"
import { useDispatch, useSelector } from 'react-redux';

import { Post } from '@mattermost/types/posts';

import TextButton from "components/widgets/buttons/text_button"
import { onSubmit } from 'actions/views/create_comment';
import { PostDraft } from 'types/store/draft';
import { clearActiveReplyAction, getActiveReplyPostIdSelector, setActiveReplyAction } from "mattermost-redux/reducers/combine/topic";


interface CommentFooterProps {
    post: Post;
    children?: React.ReactNode;
    className?: string;
}

const CommentFooterContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    // padding: 16px;
    margin: 4px 0;
    // border-top: 1px solid #e1e5e9;
    color: var(--center-channel-color-56);
    font-size: 12px;
`;

const ActionsContainer = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
`;

const ActionItem = styled.span`
    // color: #666;
    // font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: #e1e5e9;
        color: #333;
    }
`;

const ReplyButton = styled.div`
    margin-left: auto;
`;

const InputContainer = styled.div<{ isVisible: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
    max-height: ${props => props.isVisible ? '200px' : '0'};
    opacity: ${props => props.isVisible ? '1' : '0'};
    overflow: hidden;
    transition: all 0.3s ease;
    color: var(--center-channel-color);
`;

const TextArea = styled.textarea`
    flex: 1;
    min-height: 60px;
    padding: 8px 12px;
    border: 1px solid #d1d5d9;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    width: 100%;

    &:focus {
        border-color: #166de0;
        box-shadow: 0 0 0 1px #166de0;
    }
`;

const SendButton = styled.button<{ disabled?: boolean }>`
    padding: 4px 8px;
    background-color: ${props => props.disabled ? '#ccc' : '#166de0'};
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    transition: background-color 0.2s ease;

    &:hover {
        background-color: ${props => props.disabled ? '#ccc' : '#0d5bb8'};
    }
`;

const CommentFooter = ({ post, children, className }: CommentFooterProps) => {
    const [replyText, setReplyText] = useState('');
    // const [isInputVisible, setIsInputVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dispatch = useDispatch();

    // console.log('==CommentFooter rendered for post:', post.id);
    const activeReplyPostId = useSelector(getActiveReplyPostIdSelector);
    const postId = post.post_id || post.id;
    const isInputVisible = activeReplyPostId && (activeReplyPostId === postId);

    const handleReplyBtnClick = () => {
        if (isInputVisible) {
            // 隐藏输入框并清除内容
            dispatch(clearActiveReplyAction());
            setReplyText('');
        } else {
            // 显示输入框（会自动关闭其他输入框）
            dispatch(setActiveReplyAction(postId));
        }
    };

    // 当组件变为非活跃状态时，清除文本
    useEffect(() => {
        if (!isInputVisible) {
            setReplyText('');
        }
    }, [isInputVisible]);

    const handleSendClick = async () => {
        if (replyText.trim() && !isSubmitting) {
            setIsSubmitting(true);

            try {
                // 构建 PostDraft 对象
                const postId = post.id || post.post_id || '';
                const draft: PostDraft = {
                    message: replyText.trim(),
                    fileInfos: [],
                    uploadsInProgress: [],
                    channelId: post.channel_id,
                    createAt: Date.now(),
                    updateAt: Date.now(),
                    props: {},
                    pid: postId,
                    rid: post.rid || postId,
                    rootId: post.tid || '', // 如果是回复的回复，使用原始 root_id，否则使用当前 post 的 id
                    tid: post.tid || '',
                };

                // 发送回复消息
                const response = await dispatch(onSubmit(draft, {
                    afterSubmit: (result) => {
                        console.log('==发送回复 afterSubmit result:', result);
                        // 发送成功后的回调
                        setReplyText('');
                        setIsSubmitting(false);
                        dispatch(clearActiveReplyAction()); // 发送成功后清除活跃状态
                    }
                }));
                console.log('==发送回复 response:', response);
                if (response?.error) {
                    console.error('==发送回复失败:', response.error);
                    setIsSubmitting(false);
                }
            } catch (error) {
                console.error('发送回复时出错:', error);
                setIsSubmitting(false);
            }
        } else {
            console.log('==条件不满足，不执行提交');
            console.log('==replyText.trim():', replyText.trim());
            console.log('==!isSubmitting:', !isSubmitting);
        }
    };

    return (
        <CommentFooterContainer className={className}>
            <ActionsContainer>
                {children}
                <ReplyButton>
                    <TextButton onClick={handleReplyBtnClick}>
                        {isInputVisible ? '取消' : '回复'}
                    </TextButton>
                </ReplyButton>
            </ActionsContainer>
            <InputContainer isVisible={!!isInputVisible}>
                <TextArea
                    placeholder="输入评论..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendClick();
                        }
                    }}
                />
                <SendButton
                    onClick={() => {
                        console.log('==SendButton clicked, replyText:', replyText);
                        console.log('==SendButton disabled state:', isSubmitting || !replyText.trim());
                        console.log('==isSubmitting:', isSubmitting);
                        console.log('==!replyText.trim():', !replyText.trim());
                        handleSendClick();
                    }}
                    disabled={isSubmitting || !replyText.trim()}
                >
                    {isSubmitting ? '发送中...' : '发送'}
                </SendButton>
            </InputContainer>
        </CommentFooterContainer>
    )
}

export { ActionItem };
export default CommentFooter;