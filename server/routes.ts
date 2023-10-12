import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Comment, Friend, FriendSug, Point, Post, Tag, User, WebSession } from "./app";
import { CommentDoc } from "./concepts/comment";
import { PostDoc, PostOptions } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    const user = await User.create(username, password);
    if (user.user?._id) {
      await Point.create(user.user?._id);
      await Tag.create(user.user?._id);
    }
    return user;
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    await Comment.deleteByAuthor(user);
    await Post.deleteByUser(user);
    await Tag.delete(user);
    await FriendSug.delete(user);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, image?: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, image, options);
    const pointsToAdd = String(content.trim().split(/\s+/).length);
    await Point.addPoint(user, pointsToAdd);
    await Tag.update(user, content);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    await Comment.deleteByTarget(_id);
    return Post.delete(_id);
  }

  @Router.get("/comments/target/:target")
  async getCommentsByTarget(target: ObjectId) {
    const comments = await Comment.getByTarget(target);
    return Responses.comments(comments);
  }

  @Router.get("/comments")
  async getCommentsByAuthor(author?: string) {
    let comments;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      comments = await Comment.getByAuthor(id);
    } else {
      comments = await Comment.getComments({});
    }
    return Responses.comments(comments);
  }

  @Router.delete("/comments/target/:target")
  async deleteCommentsByTarget(target: ObjectId) {
    return await Comment.deleteByTarget(target);
  }

  @Router.post("/comments")
  async createComment(session: WebSessionDoc, content: string, target: ObjectId) {
    const user = WebSession.getUser(session);
    if (await Point.canComment(user)) {
      const created = await Comment.create(user, target, content);
      await Point.spendPoint(user, "2");
      return { msg: created.msg, comment: await Responses.comment(created.comment) };
    } else {
      return { msg: "user does not have enough point to comment" };
    }
  }

  @Router.patch("/comments/:_id")
  async updateComment(session: WebSessionDoc, _id: ObjectId, update: Partial<CommentDoc>) {
    const user = WebSession.getUser(session);
    await Comment.isAuthor(user, _id);
    return await Comment.update(_id, update);
  }

  @Router.delete("/comments/:_id")
  async deleteComment(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Comment.isAuthor(user, _id);
    await Comment.deleteByTarget(_id);
    return Comment.delete(_id);
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    if (await Point.canSendRequest(user)) {
      const toId = (await User.getUserByUsername(to))._id;
      return await Friend.sendRequest(user, toId);
    } else {
      return { msg: "Not enough point to send a friend request" };
    }
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.get("/points")
  async getPoints(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Point.getPoint(user);
  }

  @Router.patch("/points/add/:pointsToAdd")
  async addPoints(session: WebSessionDoc, pointsToAdd: string) {
    const user = WebSession.getUser(session);
    return await Point.addPoint(user, pointsToAdd);
  }

  @Router.patch("/points/spend/:pointsToSpend")
  async spendPoints(session: WebSessionDoc, pointsToSpend: string) {
    const user = WebSession.getUser(session);
    return await Point.spendPoint(user, pointsToSpend);
  }

  @Router.get("/tags")
  async getTags(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Tag.getByUser(user);
  }

  @Router.get("/tags/others")
  async getOtherTags(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Tag.getOtherTags(user);
  }

  @Router.post("/friendSug")
  async enable(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    await FriendSug.isEnabled(user);
    return await FriendSug.enable(user);
  }

  @Router.delete("/friendSug")
  async disable(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await FriendSug.disable(user);
  }

  @Router.patch("/friendSug")
  async generateFriendSug(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    const userTags = (await Tag.getByUser(user)).userTags;
    const otherTagsDoc = await Tag.getOtherTags(user);
    const otherTags = new Map();
    for (const TagDoc of otherTagsDoc) {
      otherTags.set((await User.getUserById(TagDoc.user)).username, TagDoc.userTags);
    }
    const suggestion = await FriendSug.generateFriendSug(user, userTags, otherTags);
    return suggestion;
  }

  @Router.get("/friendSug")
  async getFriendSuggestion(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await FriendSug.getFriendSug(user);
  }
}

export default getExpressRouter(new Routes());
