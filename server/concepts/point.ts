import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface PointDoc extends BaseDoc {
  user: ObjectId;
  point: number;
}

export default class PointConcept {
  public readonly points = new DocCollection<PointDoc>("points");

  async create(user: ObjectId) {
    const _id = await this.points.createOne({ user, point: 0 });
    return { msg: "Points successfully created!", points: await this.points.readOne({ _id }) };
  }

  async getPoint(user: ObjectId) {
    const point = await this.points.readOne({ user });
    return point;
  }

  async addPoint(user: ObjectId, pointsToAdd: string) {
    const point = await this.getPoint(user);
    if (point) {
      const newPoint = point.point + Number(pointsToAdd);
      await this.points.updateOne({ user }, { point: newPoint });
      return { msg: "Point successfully updated!" };
    }
  }

  async spendPoint(user: ObjectId, pointsToSpend: string) {
    const point = await this.getPoint(user);
    if (point) {
      const newPoint = point.point - Number(pointsToSpend);
      console.log(newPoint);
      await this.points.updateOne({ user }, { point: newPoint });
      return { msg: "Point successfully updated!" };
    }
  }

  async delete(_id: ObjectId) {
    await this.points.deleteOne({ _id });
    return { msg: "Point deleted successfully!" };
  }

  async canComment(user: ObjectId) {
    const point = await this.points.readOne({ user });
    if (point) {
      if (point.point > 0) {
        return true;
      } else {
        return false;
      }
    }
  }

  async canSendRequest(user: ObjectId) {
    const point = await this.points.readOne({ user });
    if (point) {
      if (point.point > 0) {
        return true;
      } else {
        return false;
      }
    }
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
