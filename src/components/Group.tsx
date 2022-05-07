/* eslint-disable react/no-array-index-key */
import _ from "lodash";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { MapCrdt } from "tool-db";
import ChatMessage from "./ChatMessage";
import getToolDb from "../utils/getToolDb";
import { GroupData, Message, MessagesState } from "../types";

interface GroupProps {
  state: MessagesState;
  dispatch: React.Dispatch<any>;
}

export default function Group(props: GroupProps) {
  const { state, dispatch } = props;
  const { groupRoute } = useParams();
  const toolDb = getToolDb();

  const groupKey = `==${decodeURIComponent(groupRoute || "")}`;

  const groupId = decodeURIComponent(groupRoute || "");

  const joinRequests = useRef<MapCrdt<string>>(
    new MapCrdt<string>(toolDb.getAddress() || "")
  );
  const [groupData, setGroupData] = useState<GroupData | null>(null);

  const [message, setMessage] = useState("");

  const setGroupDataWrapper = useCallback(
    (value: GroupData, listeners: number[]) => {
      setGroupData(value);

      // Update the members
      value.members.forEach((memberAddress) => {
        const key = `:${memberAddress}.group-${value.id}`;
        toolDb.getData(`:${memberAddress}.name`).then((name) => {
          dispatch({
            type: "setName",
            id: memberAddress,
            username: name || "",
          });
        });

        // Listen for messages of this member
        const listenerId = toolDb.addKeyListener<Message[]>(key, (m) => {
          if (m.type === "put") {
            dispatch({ type: "setMessages", id: memberAddress, messages: m.v });
          }
        });
        listeners.push(listenerId);

        // Subscribe only if its not our data
        if (memberAddress !== toolDb.getAddress()) {
          toolDb.subscribeData(key);
        }

        toolDb.getData(key);
      });
    },
    []
  );

  useEffect(() => {
    const listeners: number[] = [];

    dispatch({ type: "clearMessages" });
    if (groupRoute) {
      // Add listener for the group data
      const groupKeyListenerId = toolDb.addKeyListener<GroupData>(
        groupKey,
        (msg) => {
          if (msg.type === "put") {
            setGroupDataWrapper(msg.v, listeners);
          }
        }
      );
      listeners.push(groupKeyListenerId);
      toolDb.subscribeData(groupKey);

      // Add listener for join requests
      const requestsListenerId = toolDb.addKeyListener<any>(
        `requests-${groupId}`,
        (msg) => {
          if (msg.type === "crdtPut") {
            joinRequests.current.mergeChanges(msg.v);
          }
        }
      );

      listeners.push(requestsListenerId);
      toolDb.subscribeData(`requests-${groupId}`);
      toolDb.getCrdt(`requests-${groupId}`, joinRequests.current);
    }

    // Clear listeners
    return () => {
      console.log("clearing listeners: ", listeners);
      listeners.forEach((id) => {
        toolDb.removeKeyListener(id);
      });
    };
  }, [groupRoute]);

  const sendMessage = useCallback(
    (msg: string) => {
      const address = toolDb.getAddress() || "";

      if (!groupData?.members.includes(address)) return;

      const timestamp = new Date().getTime();
      const newMessage = {
        m: msg,
        t: timestamp,
      };

      // Dont push to the state directly!
      const newMessagesArray = [...(state.messages[address] || [])];
      newMessagesArray.push(newMessage);

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
    if (toolDb.getAddress() && groupData && groupRoute) {
      const address = toolDb.getAddress() || "";

      joinRequests.current.SET(address, toolDb.getUsername() || "");

      toolDb.putCrdt(`requests-${groupId}`, joinRequests.current, false);

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
                  <ChatMessage
                    key={`chat-message-${i}`}
                    index={i}
                    message={msg}
                    prevMessage={chats[i - i]}
                  />
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
                    <i>{toolDb.getAddress() === id ? "(you)" : ""}</i>
                    <b>{groupData.owners.includes(id) ? " (admin)" : ""}</b>
                  </div>
                );
              })}

              {groupData.owners.includes(toolDb.getAddress() || "") ? (
                <>
                  <p>Join requests: </p>
                  {Object.keys(joinRequests.current.value)
                    .filter((id) => !groupData.members.includes(id))
                    .map((id) => {
                      const name = joinRequests.current.value[id];
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
