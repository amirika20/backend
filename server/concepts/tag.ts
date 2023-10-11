import { Filter, ObjectId } from "mongodb";
import OpenAI from "openai";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export interface TagDoc extends BaseDoc {
  user: ObjectId;
  userTags: Array<string>;
}

export default class TagConcept {
  public readonly tags = new DocCollection<TagDoc>("tags");
  private readonly defaultTags = ["food", "school", "work", "trip", "friend", "family", "music", "workout", "weather", "book", "art", "finance"];

  async create(user: ObjectId) {
    const _id = await this.tags.createOne({ user, userTags: [] });
    return { msg: "Tag successfully created!", tag: await this.tags.readOne({ _id }) };
  }

  async getTags(query: Filter<TagDoc>) {
    const tags = await this.tags.readMany(query);
    return tags;
  }

  async getOtherTags(user: ObjectId) {
    const allTags = await this.getTags({});
    const thisTags = await this.getByUser(user);
    const otherTags = [];
    for (const tag of allTags) {
      if (tag.user.toString() !== thisTags.user.toString()) {
        otherTags.push(tag);
      }
    }
    return otherTags;
  }

  async getByUser(user: ObjectId) {
    return (await this.getTags({ user }))[0];
  }

  async update(user: ObjectId, content: string) {
    const tags = await this.generateTags(content);
    await this.tags.updateOne({ user }, { userTags: tags });
    return { msg: "Tags successfully updated!" };
  }

  async delete(user: ObjectId) {
    await this.tags.deleteOne({ user: user });
    return { msg: "Tag deleted successfully!" };
  }

  private async generateTags(data: string) {
    // Create user prompt
    // prompt to be fed into the chat-gpt-api
    const userPrompt =
      "Assign multiple topics as an array from the topic list given below to the following quote:\nQuote - " +
      data +
      "\n\ntopics = [" +
      this.defaultTags.join(", ") +
      "]\n\n Output should be in the format `topics = ['']`";

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
    });
    const message = response.choices[0];
    const content = message.message.content;
    const topicsArr = content?.match(/\[([^[\]]*)\]/);
    let topicsArr_;
    if (topicsArr) {
      topicsArr_ = topicsArr[0].match(/'[^']*'/g)?.map((topic) => topic.slice(1, -1));
    }
    const generatedTopics = topicsArr_?.map((str) => str.toLowerCase());

    // Match generated topics with default tags and create result object
    const result = generatedTopics?.filter((tag) => this.defaultTags.includes(tag));
    console.log(result);
    return result;
    // const generatedTopics = topicsArr.map((str) => str.toLowerCase());
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
