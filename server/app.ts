import CommentConcept from "./concepts/comment";
import FriendConcept from "./concepts/friend";
import FriendSugConcept from "./concepts/friendSuggestion";
import PointConcept from "./concepts/point";
import PostConcept from "./concepts/post";
import TagConcept from "./concepts/tag";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Point = new PointConcept();
export const Comment = new CommentConcept();
export const Tag = new TagConcept();
export const FriendSug = new FriendSugConcept();
