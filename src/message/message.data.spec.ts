import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { MessageData } from './message.data';
import { ChatMessageModel, ChatMessageSchema } from './models/message.model';

import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import {getTestConfiguration}  from '../configuration/configuration-manager.utils';
import { Tag } from '../conversation/models/CreateChatConversation.dto';
import { TagType } from '../conversation/models/CreateChatConversation.dto';

const id = new ObjectID('5fe0cce861c8ea54018385af');
const conversationId = new ObjectID();
const senderId = new ObjectID('5fe0cce861c8ea54018385af');
const sender2Id = new ObjectID('5fe0cce861c8ea54018385aa');
const sender3Id = new ObjectID('5fe0cce861c8ea54018385ab');

class TestMessageData extends MessageData {
  async deleteMany() {
    await this.chatMessageModel.deleteMany();
  }
}

describe('MessageData', () => {
  let messageData: TestMessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          useFactory: () => {
            const databaseConfig =
              getTestConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [TestMessageData],
    }).compile();

    messageData = module.get<TestMessageData>(TestMessageData);
  });

  beforeEach(
    async () => {
      messageData.deleteMany();
    }
  );

  afterEach(async () => {
    messageData.deleteMany();
  });

  it('should be defined', () => {
    expect(messageData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(messageData.create).toBeDefined();
    });

    it('successfully creates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      expect(message).toMatchObject(
        {
          likes: [],
          resolved: false,
          deleted: false,
          reactions: [],
          text: 'Hello world',
          senderId: senderId,
          conversationId: conversationId,
          conversation: { id: conversationId.toHexString() },
          likesCount: 0,
          sender: { id: senderId.toHexString() },
        }
      );

    });
  });


  describe('get', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const gotMessage = await messageData.getMessage(sentMessage.id.toHexString())

      expect(gotMessage).toMatchObject(sentMessage)
    });
  });

  describe('delete', () => {
    it('successfully marks a message as deleted', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to delete' },
        senderId,
      );

      // Make sure that it started off as not deleted
      expect(message.deleted).toEqual(false);

      const deletedMessage = await messageData.delete(new ObjectID(message.id));
      expect(deletedMessage.deleted).toEqual(true);

      // And that is it now deleted
      const retrievedMessage = await messageData.getMessage(message.id.toHexString())
      expect(retrievedMessage.deleted).toEqual(true);

      // Optionally, we could have the message retrieval fail due to the message being deleted.
      // In that case we would like to assert the below:
      // expect(messageData.getMessage(message.id.toHexString())).rejects.toThrow('Message not found');
    });
  });

  describe('update tags', () => {
    it('should update the tags of a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message about university' },
        senderId,
      );
      const tag1: Tag = { id: 'education', type: TagType.subTopic };
      const tag2: Tag = { id: 'research', type: TagType.subTopic };

      const taggedMessage = await messageData.updateTags(message.id, [tag1, tag2]);
      expect(taggedMessage.tags).toHaveLength(2);

      const retrievedMessage = await messageData.getMessage(message.id.toHexString());
      expect(retrievedMessage.tags).toHaveLength(2);

      const tagIds = retrievedMessage.tags?.map(tag => tag.id);
      expect(tagIds).toContain('education');
      expect(tagIds).toContain('research');
    });
  });

  it('should throw an error if the message is not found', async () => {
    const tag: Tag = { id: 'identifier', type: TagType.subTopic };
    expect(messageData.updateTags(new ObjectID(), [tag])).rejects.toThrow('Message not found');
  });
});
