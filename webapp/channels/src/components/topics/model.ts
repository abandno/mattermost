import { AlphaNum, AlphaNumN, N, NU, StringN } from "@mattermost/types/general";
import { shallowCopyInstance } from "mattermost-webapp/src/utils/utils";

type CommentNodeRole = 'topic' | 'comment' | 'reply' | 'topic-reply';
type OriginItem = {
    id: string;
    pid: StringN;
    [key: string]: any;
}

const MAX_LOAD_COUNT = 1000

/**
 * 两种模式：
 * 1. 一次性加载，用 renderMore 
 * 2. 分页加载，外部加载 update 
 */
export class CommentNode {
    public before: AlphaNumN;
    public after: AlphaNumN;
    public renderCount: number = 0;
    public isLoading: boolean = false;

    constructor(
        public readonly _name: NU<string>,
        public readonly id: string,
        public readonly pid: StringN,
        public readonly rid: StringN,
        public readonly role: CommentNodeRole, // 当期节点的角色  什么类型的树, topic的直接回复树 | topic 的评论树
        public readonly perPage: number,
        public readonly data: OriginItem, // 当前节点原数据
        public children: CommentNode[],
        // public readonly loadMoreFn: (more: number) => OriginItem[],
        public readonly offsetExtracter: (data: NU<OriginItem>) => AlphaNumN, // 偏移量获取规则, 有些根据id, 有些根据时间戳, 有些根据评论数等
        public hasMore: boolean = false, // 后端设置，前端不可知
    ) {
        this._name = _name;
        this.id = id;
        this.pid = pid;
        this.rid = rid;
        this.data = data;
        this.children = children;
        // 当前页所在位置
        this.before = null;
        this.after = null;
        this.perPage = perPage;
        this.hasMore = hasMore;
        // this.renderCount = this.perPage;
        // this.loadMoreFn = loadMoreFn;
    }

    public hasChildren() {
        return this.children?.length > 0;
    }

    public childrenSize() {
        return this.children?.length ?? 0;
    }

    // 检查是否还有更多数据可以加载
    public canRenderMore() {
        const cs = this.childrenSize();
        return cs == 0 ? this.hasMore : this.renderCount < cs;
    }

    // 用于一次性加载场景，前端实现加载更多，实际是渲染更多
    public renderMore(more: number = this.perPage) {
        if (this.childrenSize() < this.renderCount + more && this.hasMore) {
            // this.update(await loadMoreFn(more))
            return false;
        }
        this.renderCount = Math.min(this.renderCount + more, this.childrenSize());
        return true;
    }

    // 原始children上遍历渲染
    public renderChildren(render: (node: CommentNode) => any) {
        const renderNodes: any[] = [];
        for (let i = 0; i < this.renderCount; i++) {
            renderNodes.push(render(this.children[i]));
        }
        return renderNodes;
    }


    update(data: OriginItem[], hasMore = false, replace = false) {
        this.handleData(data, hasMore, replace);
    }

    private handleData(data: OriginItem[], hasMore = false, replace = false) {
        if (!data) {
            return;
        }
        const node = this;
        if (!node) {
            return;
        }
        const childRole: CommentNodeRole = this.getChildNodeRole();
        const childNodes = data.map(item => {
            const hasReply = item.drcount > 0; // 根据是否有直接回复判断评论有没有回复，直接回复都没有，必然无回复
            const n = new CommentNode(node._name + '.' + item.post_id, item.post_id, item.pid, item.rid, childRole, this.perPage, item, [], this.offsetExtracter, hasReply);
            return n;
        });

        let dataChange = false;
        if (replace) {
            // 避免有数据时给用用户展示空页, 发生在上一页或下一页到头了
            if (childNodes.length > 0) {
                node.children = childNodes;
                dataChange = true;
            }
        } else {
            node.children.push(...childNodes);
            dataChange = true;
        }

        // 更新当前页位置
        if (dataChange) {
            node.before = this.offsetExtracter(data[0]);
            node.after = this.offsetExtracter(data[data.length - 1]);
            node.hasMore = hasMore;
        }
    }

    private getChildNodeRole() {
        let childRole: CommentNodeRole;
        switch (this.role) {
            case 'topic':
                childRole = 'comment';
                break;
            case 'topic-reply':
                childRole = 'reply';
                break;
            case 'comment':
                childRole = 'reply';
                break;
            default:
                childRole = 'reply';
                break;
        }
        return childRole;
    }

    copy() {
        return shallowCopyInstance(this);
    }
}

/**
 * 评论树
 * 
 * 1. 维护当前分页信息: 所在位置,方向,页大小
 * 2. 评论树类型, 谁的评论树
 * 3. 后代节点翻页后, 要能快速获取该节点追加列表
 */
export class CommentTree extends CommentNode {
    // private nodeMap: Map<AlphaNum, CommentNode> = new Map();

    constructor(
        public readonly _name: NU<string>,
        public readonly rootId: string,
        public readonly role: CommentNodeRole,
        public readonly perPage: number,
        public readonly offsetExtracter: (data: NU<OriginItem>) => AlphaNumN, // 偏移量获取规则, 有些根据id, 有些根据时间戳, 有些根据评论数等
    ) {
        super(_name, rootId, null, null, role, perPage, { id: rootId, pid: null }, [], offsetExtracter);
    }

    // // 首次加载根树
    // init(data: OriginItem[]) {
    //     // data -> Node
    //     this.handleData(this.id, data);
    // }

    // update(nodeId: AlphaNum, data: OriginItem[]) {
    //     this.handleData(nodeId, data);
    // }

    // private handleData(nodeId: AlphaNum, data: OriginItem[]) {
    //     if (!data) {
    //         return;
    //     }
    //     const node = nodeId == this.id ? this : this.nodeMap.get(nodeId);
    //     if (!node) {
    //         return;
    //     }
    //     const childRole: CommentNodeRole = this.getChildNodeRole();
    //     data.forEach(item => {
    //         const n = new CommentNode(item.id, item.pid, item.rid, childRole, this.perPage, item, []);
    //         this.nodeMap.set(item.id, n);
    //         node.children.push(n);
    //     });
    //     // 更新当前页位置
    //     node.before = this.offsetExtracter(data[0]);
    //     node.after = this.offsetExtracter(data[data.length - 1]);
    //     node.hasMore = data.length >= this.perPage && data.length < MAX_LOAD_COUNT; // 一次性最大加载场景会有 MAX_LOAD_COUNT，此时强行限制不能 load more
    // }

}