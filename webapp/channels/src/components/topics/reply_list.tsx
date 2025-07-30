import React from 'react';
import { formatTime } from 'utils/datetime';
import { CommentNode } from './model';

interface ReplyListProps {
    node: CommentNode;
    onMore: (node: CommentNode, more?: number) => void;
    onFold: (node: CommentNode) => void;
    className?: string;
    style?: React.CSSProperties;
    initRenderCount?: number;
}

const ReplyList: React.FC<ReplyListProps> = ({
    node,
    onMore,
    onFold,
    initRenderCount = 0,
}) => {
    // 没有初始的节点且无法渲染更多, 则不渲染
    if (!node.hasChildren() && !node.canRenderMore()) {
        return null;
    }

    // 初始渲染数
    if (initRenderCount > 0) {
        let ok = node.renderMore(initRenderCount)
        if (!ok) {
            onMore(node, initRenderCount)
        }
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
                                {node.renderCount >= node.perPage || node.childrenSize() <= 0 ? '展开更多' : `展开 ${node.childrenSize()} 条回复`}
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