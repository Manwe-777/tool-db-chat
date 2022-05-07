import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sha1 } from "tool-db";
import getToolDb from "../utils/getToolDb";
import { GroupData, MessagesState } from "../types";

interface GroupsListProps {
  state: MessagesState;
  dispatch: React.Dispatch<any>;
}

export default function GroupsList(props: GroupsListProps) {
  const { state, dispatch } = props;
  const navigate = useNavigate();

  const [newGroup, setNewGroup] = useState("");

  const toolDb = getToolDb();

  // Set our groups index
  useEffect(() => {
    toolDb.getData("groups", true).then((groups) => {
      if (groups) {
        dispatch({ type: "setAllGroups", groups });
      }
    });
  }, []);

  // Create a new group
  const createGroup = useCallback(() => {
    // Use the group name and our pubkey to get the hash/id
    // The group id will be unique for us, in case someone else creates a new group with the same name
    const adress = toolDb.getAddress() || "";
    const groupId = sha1(newGroup + new Date().getTime() + adress);
    setNewGroup("");

    // The key contains the name as well, for UI display without extra queries
    const newGroupKey = `${groupId}-${newGroup}`;

    // Use the frozen namespace for the metadata
    toolDb
      .putData<GroupData>(`==${groupId}`, {
        owners: [adress],
        name: newGroup,
        id: groupId,
        members: [toolDb.getAddress() || ""],
      })
      .then((d) => {
        if (d) {
          // add this group key to our index!
          const newGroups = _.uniq([...state.groups, newGroupKey]);
          toolDb.putData("groups", newGroups, true);
          dispatch({ type: "setAllGroups", groups: newGroups });
        }
      });
  }, [state, newGroup]);

  // Change the current group, trigger everything
  const changeGroup = useCallback(
    (groupId: string) => {
      navigate(`/group/${encodeURIComponent(groupId)}`);
    },
    [dispatch]
  );

  return (
    <div className="groups-list">
      <p>Groups: </p>
      {state.groups.map((name) => {
        return (
          <div
            className="group-name"
            key={`group-name-${name}`}
            onClick={() => changeGroup(name.split("-")[0])}
          >
            {name.split("-")[1]}
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
  );
}
