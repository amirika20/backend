import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface FriendSugDoc extends BaseDoc {
  user: ObjectId;
  suggestion: Array<string>;
}

export default class FriendSugConcept {
  public readonly friendSug = new DocCollection<FriendSugDoc>("friends");

  async enable(user: ObjectId) {
    const _id = await this.friendSug.createOne({ user, suggestion: [] });
    return { msg: "FriendSuggestion created successfully!", user: await this.friendSug.readOne({ _id }) };
  }

  async isEnabled(user: ObjectId) {
    const suggestion = await this.friendSug.readOne({ user });
    if (suggestion) {
      return;
    } else {
      throw new AlreadyEnabledError(user);
    }
  }

  async delete(user: ObjectId) {
    await this.friendSug.deleteOne({ user });
  }

  async getFriendSug(user: ObjectId) {
    return await this.friendSug.readOne({ user });
  }

  async generateFriendSug(user: ObjectId, userTags: Array<string>, otherTags: Map<string, [string]>) {
    // const _id = await this.friendSug.readOne({ user });
    const suggestion = [];
    for (const [username, tags] of otherTags) {
      for (const tag of tags) {
        if (userTags.includes(tag)) {
          suggestion.push(username);
          break;
        }
      }
    }
    console.log(suggestion);
    await this.friendSug.updateOne({ user }, { suggestion });
    return { msg: "Generated some Friend Suggestion" };
  }
}

export class AlreadyEnabledError extends NotAllowedError {
  constructor(public readonly user: ObjectId) {
    super("{0} already enabled friend suggestion!", user);
  }
}
