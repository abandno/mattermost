import { AlphaNumN } from "./general";

export type TopicPageRequest = {
    before?: AlphaNumN;
    after?: AlphaNumN;
    perPage?: number;
    direction?: string;
    orderMode?: 'hot' | 'latest';
    postRole?: 'topic' | 'comment' | 'reply'
}