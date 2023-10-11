import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  image?: string;
  options?: PostOptions;
}

export default class PostConcept {
  public readonly posts = new DocCollection<PostDoc>("posts");

  async create(author: ObjectId, content: string, image?: string, options?: PostOptions) {
    const _id = await this.posts.createOne({ author, content, image, options });
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async idsToPost(ids: ObjectId[]) {
    console.log(ids);
    console.log({ _id: { $in: ids } });
    const posts = await this.posts.readMany({ _id: { $in: ids } });
    console.log(posts);
    // Store strings in Map because ObjectId comparison by reference is wrong
    const idToPost = new Map(posts.map((post) => [post._id.toString(), post]));
    console.log(idToPost);
    return ids.map((id) => idToPost.get(id.toString())?.content ?? "DELETED_USER");
  }

  async getPostById(_id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (post === null) {
      throw new NotFoundError(`Post not found!`);
    }
    return post;
  }

  async getPosts(query: Filter<PostDoc>) {
    const posts = await this.posts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async getByAuthor(author: ObjectId) {
    return await this.getPosts({ author });
  }

  async update(_id: ObjectId, update: Partial<PostDoc>) {
    this.sanitizeUpdate(update);
    await this.posts.updateOne({ _id }, update);
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async deleteByUser(author: ObjectId) {
    await this.posts.deleteMany({ author: author });
    return { msg: `All '${author}''s posts deleted successfully!` };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  private sanitizeUpdate(update: Partial<PostDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["content", "options"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
