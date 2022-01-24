import Automerge from "automerge";
import _ from "lodash";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base64ToBinaryDocument } from "tool-db";
import getToolDb from "./getToolDb";
import { GroupData, Message, MessagesState } from "./types";

interface GroupProps {
  state: MessagesState;
  dispatch: React.Dispatch<any>;
}

export default function Group(props: GroupProps) {
  const { state, dispatch } = props;
  const { groupRoute } = useParams();

  const groupKey = `==${decodeURIComponent(groupRoute || "")}`;

  const groupId = decodeURIComponent(groupRoute || "");

  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<Record<string, string>>({});
  const [groupData, setGroupData] = useState<GroupData | null>(null);

  const [message, setMessage] = useState("");

  const toolDb = getToolDb();

  useEffect(() => {
    if (groupRoute) {
      toolDb.addKeyListener<GroupData>(groupKey, (msg) => {
        if (msg.type === "put") {
          setGroupData(msg.v);
        }
      });
      toolDb.subscribeData(groupKey);

      toolDb.addKeyListener<any>(`requests-${groupId}`, (msg) => {
        if (msg.type === "crdt") {
          const doc = Automerge.load<any>(base64ToBinaryDocument(msg.doc));
          const newDoc = Automerge.merge<any>(Automerge.init(), doc);
          setJoinRequests(newDoc);
        }
      });

      toolDb.subscribeData(`requests-${groupId}`);
    }
  }, [groupRoute]);

  useEffect(() => {
    // Add listeners to the keys!
    // even ours, oh yep
    if (!groupData) return;

    groupData.members.forEach((id) => {
      const key = `:${id}.group-${groupData.id}`;

      toolDb.getData(`:${id}.name`).then((name) => {
        dispatch({ type: "setName", id, username: name || "" });
      });

      toolDb.addKeyListener<Message[]>(key, (msg) => {
        if (msg.type === "put") {
          dispatch({ type: "setMessages", id, messages: msg.v });
        }
      });
      toolDb.subscribeData(key);
    });
  }, [groupData]);

  const sendMessage = useCallback(
    (msg: string) => {
      const pubKey = toolDb.user?.pubKey || "";

      if (!groupData?.members.includes(pubKey)) return;

      const timestamp = new Date().getTime();
      const newMessage = {
        message: msg,
        timestamp,
      };

      const newMessagesArray = [...(state.messages[pubKey] || []), newMessage];
      dispatch({ type: "setMessages", id: pubKey, messages: newMessagesArray });
      toolDb.putData<Message[]>(
        `group-${groupData.id}`,
        newMessagesArray,
        true
      );
    },
    [groupData, message, state]
  );

  const addMember = useCallback(
    (id: string) => {
      if (groupData && groupRoute && !groupData.members.includes(id)) {
        const groupToAdd: GroupData = {
          ...groupData,
          members: [...groupData.members, id],
        };
        toolDb.putData<GroupData>(groupKey, groupToAdd);
      }
    },
    [groupRoute, groupData]
  );

  const sendRequest = useCallback(() => {
    if (toolDb.user && groupRoute) {
      const pubKey = toolDb.user.pubKey || "";
      const origDoc = Automerge.init<any>();

      const docChange = Automerge.change(origDoc, (doc) => {
        // eslint-disable-next-line no-param-reassign
        doc[pubKey] = toolDb.user?.name || "";
      });

      toolDb.putCrdt(
        `requests-${groupId}`,
        Automerge.getChanges(origDoc, docChange),
        false
      );

      const newGroups = _.uniq([...allGroups, groupRoute]);
      toolDb.putData("groups", newGroups, true);
      setAllGroups(newGroups);
    }
  }, [allGroups, groupRoute]);

  let chats: Message[] = [];

  Object.keys(state.messages).forEach((id) => {
    const arr = state.messages[id].map((m) => {
      return {
        ...m,
        username: state.names[id],
      };
    });
    chats = [...chats, ...arr];
  });

  chats.sort((a, b) => a.timestamp - b.timestamp);

  return (
    <>
      {groupRoute && groupData ? (
        <>
          <div className="chat">
            <div className="chat-messages">
              {chats.map((msg, i) => {
                return (
                  <>
                    {i === 0 || msg.username !== chats[i - 1].username ? (
                      <div className="chat-username">
                        <b>{msg.username}</b>
                        <i>{new Date(msg.timestamp).toDateString()}</i>
                      </div>
                    ) : (
                      <></>
                    )}
                    <div
                      className="chat-message"
                      key={`message-${msg.timestamp}`}
                    >
                      {msg.message}
                    </div>
                  </>
                );
              })}
            </div>
            <input
              className="chat-input"
              value={message}
              onChange={(e) => {
                setMessage(e.currentTarget.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage(e.currentTarget.value);
                  setMessage("");
                }
              }}
            />
          </div>
          <div className="members-list">
            <p>Members: </p>
            <div>
              {_.uniq(groupData.members).map((id) => {
                return (
                  <div className="group-member" key={`group-member-${id}`}>
                    {state.names[id]}
                    <i>{toolDb.user?.pubKey === id ? "(you)" : ""}</i>
                    <b>{groupData.owner === id ? " (admin)" : ""}</b>
                  </div>
                );
              })}

              {toolDb.user?.pubKey === groupData.owner ? (
                <>
                  <p>Join requests: </p>
                  {Object.keys(joinRequests)
                    .filter((id) => !groupData.members.includes(id))
                    .map((id) => {
                      const name = joinRequests[id];
                      return (
                        <div
                          className="group-member"
                          key={`join-request-${id}`}
                          onClick={() => addMember(id)}
                        >
                          {name}
                        </div>
                      );
                    })}
                </>
              ) : (
                <button type="button" onClick={sendRequest}>
                  Request join
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <p>Select or create a group to start</p>
      )}
    </>
  );
}
