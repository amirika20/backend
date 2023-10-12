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

  async disable(user: ObjectId) {
    await this.isDisabled(user);
    await this.friendSug.deleteMany({ user: user });
    return { msg: "Disabled successfully!" };
  }

  async isDisabled(user: ObjectId) {
    const suggestion = await this.friendSug.readOne({ user: user });
    console.log(suggestion);
    if (!suggestion) {
      throw new IsNotEnabledError(user);
    } else {
      return;
    }
  }

  async isEnabled(user: ObjectId) {
    const suggestion = await this.friendSug.readOne({ user: user });
    console.log(suggestion);
    if (suggestion) {
      throw new AlreadyEnabledError(user);
    } else {
      return;
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
    await this.isDisabled(user);
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

export class AlreadyDisabledError extends NotAllowedError {
  constructor(public readonly user: ObjectId) {
    super("{0} already disabled friend suggestion!", user);
  }
}

export class IsNotEnabledError extends NotAllowedError {
  constructor(public readonly user: ObjectId) {
    super("{0} has not enabled friend suggestion!", user);
  }
}
