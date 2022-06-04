/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-array-index-key */
import _ from "lodash";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { MapCrdt } from "tool-db";
import { MapChanges } from "tool-db/dist/crdt/mapCrdt";
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
          dispatch({ type: "setMessages", id: memberAddress, messages: m.v });
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
          setGroupDataWrapper(msg.v, listeners);
        }
      );
      listeners.push(groupKeyListenerId);
      toolDb.subscribeData(groupKey);
      toolDb.getData(groupKey);

      // Add listener for join requests
      const requestsListenerId = toolDb.addKeyListener<MapChanges<string>[]>(
        `requests-${groupId}`,
        (msg) => {
          console.warn(msg);
          joinRequests.current.mergeChanges(msg.v);
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

  function checkIfWeJoined() {
    // Check if we asked this group to join already
    return (
      joinRequests.current
        .getChanges()
        .filter((ch) => ch.k === toolDb.getAddress()).length !== 0
    );
  }

  function areWeOwners() {
    // Check if we are the group owners
    return groupData?.owners.includes(toolDb.getAddress() || "") || false;
  }

  const sendRequest = useCallback(() => {
    if (toolDb.getAddress() && groupData && groupRoute) {
      const address = toolDb.getAddress() || "";

      // Check if we already asked to join this group
      if (checkIfWeJoined() === false) {
        joinRequests.current.SET(address, toolDb.getUsername() || "");

        toolDb.putCrdt(`requests-${groupId}`, joinRequests.current, false);

        const newGroups = _.uniq([
          ...state.groups,
          `${groupData.id}-${groupData.name}`,
        ]);
        toolDb.putData("groups", newGroups, true);
        dispatch({ type: "setAllGroups", groups: newGroups });
      }
    }
  }, [joinRequests.current, state, groupData, groupRoute]);

  // Get all chats and sort them
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
                    prevMessage={chats[i - 1]}
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

              {areWeOwners() === true ? (
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
                <></>
              )}
              {areWeOwners() === false && checkIfWeJoined() === false ? (
                <button type="button" onClick={sendRequest}>
                  Request join
                </button>
              ) : areWeOwners() === false ? (
                <p>
                  <i>You already requested to join this group</i>
                </p>
              ) : (
                <></>
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
