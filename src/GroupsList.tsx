import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sha1 } from "tool-db";
import getToolDb from "./getToolDb";
import { GroupData } from "./types";

interface GroupsListProps {
  dispatch: React.Dispatch<any>;
}

export default function GroupsList(props: GroupsListProps) {
  const { dispatch } = props;
  const navigate = useNavigate();

  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");

  const toolDb = getToolDb();

  useEffect(() => {
    toolDb.getData("groups", true).then((groups) => {
      if (groups) {
        setAllGroups(groups);
      }
    });
  }, []);

  const createGroup = useCallback(() => {
    setNewGroup("");
    const pubKey = toolDb.user?.pubKey || "";
    const groupId = sha1(newGroup + new Date().getTime() + pubKey);

    const newGroupKey = `${groupId}-${newGroup}`;
    toolDb
      .putData<GroupData>(`==${groupId}`, {
        owner: pubKey,
        name: newGroup,
        id: groupId,
        members: [toolDb.user?.pubKey || ""],
      })
      .then((d) => {
        if (d) {
          const newGroups = _.uniq([...allGroups, newGroupKey]);
          toolDb.putData("groups", newGroups, true);
          setAllGroups(newGroups);
        }
      });
  }, [allGroups, newGroup]);

  // Change the current group, trigger everything
  const changeGroup = useCallback(
    (groupId: string) => {
      dispatch({ type: "clearMessages" });
      navigate(`/group/${encodeURIComponent(groupId)}`);
    },
    [dispatch]
  );

  return (
    <div className="groups-list">
      <p>Groups: </p>
      {allGroups.map((name) => {
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
