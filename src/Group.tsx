import Automerge from "automerge";
import _ from "lodash";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { hexToUint8 } from "tool-db";
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

  const joinRequests = useRef<Automerge.FreezeObject<any>>(Automerge.init());
  const [groupData, setGroupData] = useState<GroupData | null>(null);

  const [message, setMessage] = useState("");

  const toolDb = getToolDb();

  const setGroupDataWrapper = useCallback(
    (value: GroupData, listeners: number[]) => {
      setGroupData(value);

      // Update the members
      value.members.forEach((id) => {
        const key = `:${id}.group-${value.id}`;
        toolDb.getData(`:${id}.name`).then((name) => {
          dispatch({ type: "setName", id, username: name || "" });
        });
      
        // Listen for messages of this member
        const listenerId = toolDb.addKeyListener<Message[]>(key, (m) => {
          if (m.type === "put") {
            dispatch({ type: "setMessages", id, messages: m.v });
          }
        });
        listeners.push(listenerId);

        // Subscribe only if its not our data
        if (id !== toolDb.getPubKey()) {
          toolDb.subscribeData(key);
        }

        toolDb.getData(key);
      });
    },
    []
  );

  useEffect(() => {
    const listeners: number[] = [];
    joinRequests.current = Automerge.init();
    dispatch({ type: "clearMessages" });
    if (groupRoute) {
      // Add listener for the group data
      toolDb.addKeyListener<GroupData>(groupKey, (msg) => {
        if (msg.type === "put") {
          setGroupDataWrapper(msg.v, listeners);
        }
      });
      toolDb.subscribeData(groupKey);
      toolDb.getData<GroupData>(groupKey).then((d) => {
        if (d) {
          setGroupDataWrapper(d, listeners);
        }
      });

      // Add listener for join requests
      const listenerId = toolDb.addKeyListener<any>(
        `requests-${groupId}`,
        (msg) => {
          if (msg.type === "crdt") {
            let doc = Automerge.load(hexToUint8(msg.doc) as any);
            const newDoc = Automerge.merge<any>(joinRequests.current, doc);
            joinRequests.current = newDoc;
          }
        }
      );
      listeners.push(listenerId);
      toolDb.subscribeData(`requests-${groupId}`);
      toolDb.getCrdt(`requests-${groupId}`);
    }

    // Clear listeners
    return () => {
      listeners.forEach((id) => {
        toolDb.removeKeyListener(id);
      });
    };
  }, [groupRoute]);

  const sendMessage = useCallback(
    (msg: string) => {
      const address = toolDb.getPubKey() || "";

      if (!groupData?.members.includes(address)) return;

      const timestamp = new Date().getTime();
      const newMessage = {
        m: msg,
        t: timestamp,
      };

      const newMessagesArray = [...(state.messages[address] || []), newMessage];
      dispatch({
        type: "setMessages",
        id: address,
        messages: newMessagesArray,
      });
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
    if (toolDb.getPubKey() && groupData && groupRoute) {
      const address = toolDb.getPubKey() || "";

      const docChange = Automerge.change(joinRequests.current, (doc) => {
        // eslint-disable-next-line no-param-reassign
        doc[address] = toolDb.getUsername() || "";
      });

      toolDb.putCrdt(
        `requests-${groupId}`,
        Automerge.getChanges(joinRequests.current, docChange),
        false
      );

      const newGroups = _.uniq([
        ...state.groups,
        `${groupData.id}-${groupData.name}`,
      ]);
      toolDb.putData("groups", newGroups, true);
      dispatch({ type: "setAllGroups", groups: newGroups });
    }
  }, [state, groupData, groupRoute]);

  let chats: Message[] = [];

  Object.keys(state.messages).forEach((id) => {
    const arr = state.messages[id].map((m) => {
      return {
        ...m,
        u: state.names[id],
      } as Message;
    });
    chats = [...chats, ...arr];
  });

  chats.sort((a, b) => a.t - b.t);

  return (
    <>
      {groupRoute && groupData ? (
        <>
          <div className="chat">
            <div className="chat-messages">
              {chats.map((msg, i) => {
                return (
                  <>
                    {i === 0 || msg.u !== chats[i - 1].u ? (
                      <div className="chat-username">
                        <b>{msg.u}</b>
                        <i>{new Date(msg.t).toDateString()}</i>
                      </div>
                    ) : (
                      <></>
                    )}
                    <div className="chat-message" key={`message-${msg.t}`}>
                      {msg.m}
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
                    <i>{toolDb.getPubKey() === id ? "(you)" : ""}</i>
                    <b>{groupData.owners.includes(id) ? " (admin)" : ""}</b>
                  </div>
                );
              })}

              {groupData.owners.includes(toolDb.getPubKey() || "") ? (
                <>
                  <p>Join requests: </p>
                  {Object.keys(joinRequests.current)
                    .filter((id) => !groupData.members.includes(id))
                    .map((id) => {
                      const name = joinRequests.current[id];
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
