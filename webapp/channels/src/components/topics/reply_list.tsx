import React from 'react';
import { formatTime } from 'utils/datetime';
import { CommentNode } from './model';

interface ReplyListProps {
    node: CommentNode;
    onMore: (node: CommentNode) => void;
    onFold: (node: CommentNode) => void;
    className?: string;
    style?: React.CSSProperties;
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

    return (
        <div className='reply-list'>
            <div className='reply-list__comments'>
                {node.renderChildren((reply) => (
                    <div key={reply.id} className='comment'>
                        <div className='comment-content'>
                            {reply.data.message}
                        </div>
                        <div className='comment-meta'>
                            <span className='comment-author'>
                                {reply.data.user_id || '未知用户'}
                            </span>
                            <span className='comment-time'>
                                {formatTime(reply.data.create_at)}
                            </span>
                        </div>
                    </div>
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
                            <span
                                className='load-more-hint clickable'
                                onClick={() => onMore(node)}
                            >
                                {node.renderCount >= node.perPage ? '展开更多' : '展开 ' + node.childrenSize() + ' 条回复'}
                            </span>
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