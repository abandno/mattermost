import React from 'react';
import { formatTime } from 'utils/datetime';
import { CommentNode } from './model';
import UserProfile from 'components/user_profile';
import ProfilePicture from 'components/profile_picture';
import { useUser } from 'components/common/hooks/useUser';
import { Client4 } from 'mattermost-redux/client';

interface ReplyListProps {
    node: CommentNode;
    onMore: (node: CommentNode, more?: number) => void;
    onFold: (node: CommentNode) => void;
    className?: string;
    style?: React.CSSProperties;
}

// 单独的回复组件，可以安全地调用 useUser hook
const ReplyItem = ({ reply }: { reply: CommentNode }) => {
    const replyAuthor = useUser(reply.data.user_id || '');
    
    return (
        <div className='comment'>
            <div className='comment-header'>
                <ProfilePicture
                    src={replyAuthor ? Client4.getProfilePictureUrl(replyAuthor.id, replyAuthor.last_picture_update) : ''}
                    size='xs'
                    userId={replyAuthor?.id}
                    username={replyAuthor?.username}
                />
                <UserProfile
                    userId={reply.data.user_id}
                    displayUsername={true}
                />
                <span className='comment-time'>
                    {formatTime(reply.data.create_at)}
                </span>
            </div>
            <div className='comment-content'>
                {reply.data.message}
            </div>
        </div>
    );
};

const FoldSpan = ({ node, onMore }: { node: CommentNode, onMore: (node: CommentNode, more?: number) => void }) => {
    return (
        <span
            className='load-more-hint clickable'
            onClick={() => onMore(node)}
        >
            {node.renderCount >= node.perPage || node.childrenSize() <= 0 ? '展开更多' : `展开 ${node.childrenSize()} 条回复`}
        </span>
    )
}

const ReplyList: React.FC<ReplyListProps> = ({
    node,
    onMore,
    onFold,
}) => {
    // 没有初始的节点且无法渲染更多, 则不渲染
    if (!node.hasChildren() && !node.canRenderMore()) {
        return null;
    }

    if (node.renderCount < 1) {
        return <div className='reply-list__fold-all'>
            <FoldSpan node={node} onMore={onMore} />
        </div>;
    }

    return (
        <div className='reply-list'>
            <div className='reply-list__comments'>
                {node.renderChildren((reply) => (
                    <ReplyItem key={reply.id} reply={reply} />
                ))}
            </div>
            <div
                className={`reply-list__load-more`}
            >
                {node.isLoading ? (
                    <span>加载中...</span>
                ) : (
                    <div>
                        {node.canRenderMore() &&
                            <FoldSpan node={node} onMore={onMore} />
                        }
                        {node.renderCount > 0 && (
                            <span
                                className='load-more-hint clickable'
                                onClick={() => onFold(node)}
                            >
                                收起
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
};

export default ReplyList; 