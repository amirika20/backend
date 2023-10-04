import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface TagDoc extends BaseDoc {
  post: ObjectId;
  tag: string;
}

export default class TagConcept {
  public readonly tags = new DocCollection<TagDoc>("tags");

  async create(post: ObjectId, tag: string) {
    const _id = await this.tags.createOne({ post, tag });
    return { msg: "Post successfully created!", tag: await this.tags.readOne({ _id }) };
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
