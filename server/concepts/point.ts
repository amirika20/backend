import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface PointDoc extends BaseDoc {
  user: ObjectId;
  points: number;
}

export default class PointConcept {
  public readonly points = new DocCollection<PointDoc>("points");

  async create(user: ObjectId, points: number) {
    const _id = await this.points.createOne({ user, points });
    return { msg: "Post successfully created!", post: await this.points.readOne({ _id }) };
  }

  async getPoint(user: ObjectId) {
    const point = await this.points.readOne({ user });
    return point;
  }

  async update(_id: ObjectId, update: Partial<PointDoc>) {
    this.sanitizeUpdate(update);
    await this.points.updateOne({ _id }, update);
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.points.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  private sanitizeUpdate(update: Partial<PointDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["points"];
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
