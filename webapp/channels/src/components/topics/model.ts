import { AlphaNum, AlphaNumN } from "@mattermost/types/general";
import { shallowCopyInstance } from "mattermost-webapp/src/utils/utils";

type CommentNodeRole = 'topic' | 'comment' | 'reply' | 'topic-reply';
type OriginItem = {
    id: string;
    pid: string | null;
    [key: string]: any;
}

export class CommentNode {
    public before: AlphaNumN;
    public after: AlphaNumN;
    constructor(
        public readonly id: string,
        public readonly pid: string | null,
        public readonly rid: string | null,
        public readonly role: CommentNodeRole, // 当期节点的角色  什么类型的树, topic的直接回复树 | topic 的评论树
        public readonly data: OriginItem, // 当前节点原数据
        public readonly children: CommentNode[],
    ) {
        this.id = id;
        this.pid = pid;
        this.rid = rid;
        this.data = data;
        this.children = children;
        // 当前页所在位置
        this.before = null;
        this.after = null;
    }

    public hasChildren() {
        return this.children?.length > 0;
    }

    public childrenSize() {
        return this.children?.length ?? 0;
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
    private nodeMap: Map<AlphaNum, CommentNode> = new Map();

    constructor(
        public readonly rootId: string,
        public readonly role: CommentNodeRole,
        public readonly offsetExtracter: (data: any) => AlphaNumN, // 偏移量获取规则, 有些根据id, 有些根据时间戳, 有些根据评论数等
    ) {
        super(rootId, null, null, role, { id: rootId, pid: null }, []);
    }

    // 首次加载根树
    init(data: OriginItem[]) {
        // data -> Node
        this.handleData(this.id, data);
    }

    update(nodeId: AlphaNum, data: OriginItem[]) {
        this.handleData(nodeId, data);
    }

    copy() {
        return shallowCopyInstance(this);
    }

    private handleData(nodeId: AlphaNum, data: OriginItem[]) {
        const node = nodeId == this.id ? this : this.nodeMap.get(nodeId);
        if (!node) {
            return;
        }
        const childRole: CommentNodeRole = this.getChildNodeRole();
        data?.forEach(item => {
            const n = new CommentNode(item.id, item.pid, item.rid, childRole, item, []);
            this.nodeMap.set(item.id, n);
            node.children.push(n);
        });
        // 更新当前页位置
        node.before = this.offsetExtracter(data[0]);
        node.after = this.offsetExtracter(data[data.length - 1]);
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
}