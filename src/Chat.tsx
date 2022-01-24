import { useReducer } from "react";

import { Routes, Route } from "react-router-dom";

import _ from "lodash";

import { MessagesState } from "./types";
import GroupsList from "./GroupsList";
import Group from "./Group";

const initialState: MessagesState = { names: {}, messages: {}, groups: [] };

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
    case "setAllGroups":
      return {
        ...state,
        groups: action.groups,
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

  return (
    <>
      <GroupsList dispatch={dispatch} state={state} />
      <Routes>
        <Route path="/group">
          <Route
            path=":groupRoute"
            element={<Group dispatch={dispatch} state={state} />}
          />
        </Route>
      </Routes>
    </>
  );
}
