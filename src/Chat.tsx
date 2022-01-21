import { useCallback, useEffect, useReducer, useState } from "react";

import _ from "lodash";

import { sha1 } from "tool-db";
import getToolDb from "./getToolDb";
import { GroupData, Message, MessagesState } from "./types";

const initialState: MessagesState = { names: {}, messages: {} };

function reducer(state: MessagesState, action: any): MessagesState {
  switch (action.type) {
    case "setMessages":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.id]: action.messages,
        },
      };
    case "setName":
      return {
        ...state,
        names: {
          ...state.names,
          [action.id]: action.username,
        },
      };
    case "clearMessages":
      return {
        ...state,
        messages: {},
      };
    default:
      throw new Error();
  }
}

export default function Chat() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [currentGroup, setCurrentGroup] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [memberAdd, setMemberAdd] = useState("");
  const [message, setMessage] = useState("");
  const toolDb = getToolDb();

  useEffect(() => {
    toolDb.queryKeys("group-").then((groups) => {
      if (groups) {
        setAllGroups(groups);
      }
    });
  }, []);

  const createGroup = useCallback(() => {
    setNewGroup("");
    const pubKey = toolDb.user?.pubKey || "";
    const groupId = sha1(newGroup + new Date().getTime() + pubKey);

    const newGroupKey = `group-${pubKey}-${newGroup}-${groupId}`;
    toolDb
      .putData<GroupData>(newGroupKey, {
        owner: pubKey,
        id: groupId,
        members: [toolDb.user?.pubKey || ""],
      })
      .then((d) => {
        if (d) {
          const newGroups = [...allGroups, newGroupKey];
          setAllGroups(newGroups);
        }
      });
  }, [allGroups, newGroup]);

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

  const addMember = useCallback(() => {
    toolDb.getData(`==${memberAdd}`).then((user) => {
      if (user) {
        const key = user.keys.skpub;
        if (groupData && !groupData.members.includes(key)) {
          const groupToAdd: GroupData = {
            ...groupData,
            members: [...groupData.members, key],
          };
          toolDb.putData<GroupData>(currentGroup, groupToAdd);
        }
      }
    });
  }, [memberAdd, currentGroup, groupData]);

  // Change the current group, trigger everything
  const changeGroup = useCallback(
    (name: string) => {
      dispatch({ type: "clearMessages" });
      setCurrentGroup(name);
      toolDb.addKeyListener<GroupData>(name, (msg) => {
        if (msg.type === "put") {
          setGroupData(msg.v);
        }
      });
      toolDb.subscribeData(name);
    },
    [dispatch]
  );

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
      <div className="groups-list">
        <p>Groups: </p>
        {allGroups.map((name) => {
          return (
            <div
              className={`group-name ${
                name === currentGroup ? "selected" : ""
              }`}
              key={`group-name-${name}`}
              onClick={() => changeGroup(name)}
            >
              {name.slice(6).split("-")[1]}
            </div>
          );
        })}
        <div>
          <input
            value={newGroup}
            onChange={(e) => setNewGroup(e.currentTarget.value)}
          />
          <button type="button" onClick={createGroup}>
            Create
          </button>
        </div>
      </div>
      <div className="chat">
        {currentGroup !== "" && groupData ? (
          <>
            <div className="chat-messages">
              {chats.map((msg, i) => {
                return (
                  <>
                    {i === 0 || msg.username !== chats[i - 1].username ? (
                      <div className="chat-username">
                        <b>{msg.username}</b>{" "}
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
          </>
        ) : (
          <p>Select or create a group to start</p>
        )}
      </div>
      <div className="members-list">
        <p>Members: </p>
        <div>
          {currentGroup !== "" && groupData ? (
            <>
              {_.uniq(groupData.members).map((id) => {
                return (
                  <div className="group-member" key={`group-member-${id}`}>
                    {state.names[id]}{" "}
                    <i>{toolDb.user?.pubKey === id ? "(you)" : ""}</i>
                    <b>{groupData.owner === id ? " (admin)" : ""}</b>
                  </div>
                );
              })}
              {toolDb.user?.pubKey === groupData.owner ? (
                <>
                  <input
                    value={memberAdd}
                    onChange={(e) => setMemberAdd(e.currentTarget.value)}
                  />
                  <button type="button" onClick={addMember}>
                    Add member
                  </button>
                </>
              ) : (
                <></>
              )}
            </>
          ) : (
            <></>
          )}
        </div>
      </div>
    </>
  );
}
